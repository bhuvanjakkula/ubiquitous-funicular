"""Thin local routes: delegate ingest and integrity calculations to core APIs."""
from dataclasses import asdict
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile
from starlette.concurrency import run_in_threadpool
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import Job, BankLine, JournalEntry, JournalLine, Finding, Match, EvidencePack
from ledgertrace.detect.run_all import RunError, run_all
from ledgertrace.detect.base import DetectorError
from ledgertrace.replay.engine import ReplayError, load_rollforward
from ledgertrace.evidence.pack import evidence_path
from ledgertrace.ingest.errors import IngestError
from ledgertrace.ingest.job_config import JobConfig
from ledgertrace.ingest.service import ingest_job
from .deps import get_db
from .license import validate_license_key

router = APIRouter()


def error(status, code, message, **details):
    raise HTTPException(status_code=status, detail=dict(error=message, code=code, **details))


def get_job(session, job_id):
    job = session.get(Job, job_id)
    if job is None:
        error(404, "NOT_FOUND", "job not found")
    return job


def finding_dict(row):
    return dict(id=row.id, detector_id=row.detector_id, severity=row.severity, title=row.title,
                amount_cents=row.amount_cents, cite_bank_ids=json.loads(row.cite_bank_ids_json),
                cite_line_ids=json.loads(row.cite_line_ids_json),
                cite_entry_ids=json.loads(row.cite_entry_ids_json), payload=json.loads(row.payload_json))


@router.post("/jobs", status_code=201)
async def create_job(request: Request, session: Session = Depends(get_db)):
    try:
        async with request.form() as form:
            bank, gl = form.get("bank"), form.get("gl")
            for name, upload in (("bank", bank), ("gl", gl)):
                if not isinstance(upload, UploadFile) or not (upload.filename or "").lower().endswith(".csv"):
                    error(400, "INGEST_ERROR", name + " must be a CSV upload")
            raw_config = form.get("config")
            if raw_config is None:
                raw_config = form.get("job")
            if isinstance(raw_config, UploadFile):
                raw_config = await raw_config.read()
            if not isinstance(raw_config, (str, bytes)):
                error(400, "INGEST_ERROR", "config JSON is required", missing_fields=["config"])
            config = JobConfig.model_validate_json(raw_config)
            
            # Validate license key before allowing ingest
            validate_license_key(config.license_key)
            
            upload_root = Path(os.environ.get("LEDGERTRACE_DATA_DIR", "data")) / "uploads"
            upload_root.mkdir(parents=True, exist_ok=True)
            with TemporaryDirectory(dir=upload_root, prefix="ingest-") as directory:
                paths = []
                for name, upload in (("bank", bank), ("gl", gl)):
                    path = Path(directory) / (name + ".csv")  # never trust uploaded path names
                    with path.open("wb") as target:
                        while chunk := await upload.read(1024 * 1024):
                            target.write(chunk)
                    paths.append(path)
                job = await run_in_threadpool(ingest_job, session, *paths, config)
                return dict(job_id=job.id, status=job.status)
    except IngestError as exc:
        missing = sorted({field for item in exc.errors for field in item.get("missing_fields", [])})
        print("INGEST ERROR:", repr(exc)); error(400, "INGEST_ERROR", str(exc), **({"missing_fields": missing} if missing else {}))
    except ValidationError as exc:
        print("INGEST ERROR:", repr(exc)); error(400, "INGEST_ERROR", str(exc))


@router.get("/jobs/{job_id}")
def read_job(job_id: str, session: Session = Depends(get_db)):
    job = get_job(session, job_id)
    counts = {}
    for name, model in (("bank_lines", BankLine), ("journal_entries", JournalEntry),
                        ("journal_lines", JournalLine), ("matches", Match), ("findings", Finding)):
        counts[name] = session.scalar(select(func.count()).select_from(model).where(model.job_id == job_id))
    for severity in ("FAIL", "UNKNOWN", "INFO"):
        counts["findings_" + severity.lower()] = session.scalar(select(func.count()).select_from(Finding)
            .where(Finding.job_id == job_id, Finding.severity == severity))
    return dict(job_id=job.id, status=job.status, entity_name=job.entity_name,
                period_start=job.period_start.isoformat(), period_end=job.period_end.isoformat(),
                currency=job.currency, error=job.error, counts=counts,
                hashes=dict(bank=job.input_bank_sha256, gl=job.input_gl_sha256))


@router.post("/jobs/{job_id}/run")
def run_job(job_id: str, session: Session = Depends(get_db)):
    job = get_job(session, job_id)
    if job.status == "failed":
        error(409, "FAILED_JOB", "cannot run failed job")
    try:
        result = run_all(session, job_id)
    except (RunError, ReplayError, DetectorError) as exc:
        error(409, "NOT_READY", str(exc))
    return dict(result, finding_counts=dict(result["finding_counts"],
                by_detector={detector: sum(counts.values()) for detector, counts in result["finding_counts_by_detector"].items()}),
                evidence_pdf=f"/api/jobs/{job_id}/evidence.pdf")


@router.get("/jobs/{job_id}/findings")
def findings(job_id: str, session: Session = Depends(get_db)):
    get_job(session, job_id)
    rows = session.scalars(select(Finding).where(Finding.job_id == job_id).order_by(Finding.detector_id, Finding.id))
    return {"items": [finding_dict(row) for row in rows]}


@router.get("/jobs/{job_id}/rollforward")
def rollforward(job_id: str, session: Session = Depends(get_db)):
    job = get_job(session, job_id)
    if job.status not in ("replayed", "detected"):
        error(409, "NOT_READY", "job has not been replayed")
    try:
        return asdict(load_rollforward(job_id))
    except ReplayError:
        error(409, "NOT_READY", "roll-forward is not available; run the job")


@router.get("/jobs/{job_id}/matches")
def matches(job_id: str, session: Session = Depends(get_db)):
    get_job(session, job_id)
    rows = session.scalars(select(Match).where(Match.job_id == job_id).order_by(Match.id))
    return {"items": [dict(id=r.id, bank_line_id=r.bank_line_id, journal_line_id=r.journal_line_id,
                           method=r.method, confidence=r.confidence) for r in rows]}


@router.get("/jobs/{job_id}/evidence.json")
def evidence_json(job_id: str, session: Session = Depends(get_db)):
    get_job(session, job_id)
    pack = session.get(EvidencePack, scoped_id(job_id, "evidence"))
    path = evidence_path(job_id)
    if pack is None or not path.is_file():
        error(404, "NOT_FOUND", "evidence JSON not available; run the job first")
    return FileResponse(path, media_type="application/json", filename="evidence.json")


@router.get("/jobs/{job_id}/evidence.pdf")
def evidence_pdf(job_id: str, session: Session = Depends(get_db)):
    get_job(session, job_id)
    pack = session.get(EvidencePack, scoped_id(job_id, "evidence"))
    if pack is None or not pack.pdf_path or not Path(pack.pdf_path).is_file():
        error(404, "NOT_FOUND", "evidence PDF not available")
    return FileResponse(pack.pdf_path, media_type="application/pdf", filename="evidence.pdf")
