"""Deterministic evidence JSON and one job-scoped EvidencePack row.

No commit here: run_all owns persistence and restores the prior file if its
transaction fails. Direct callers own that same transaction responsibility.
"""
from collections import Counter
from .draft_jes import build_draft_jes, DRAFT_DISCLAIMER
from dataclasses import asdict
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from sqlalchemy import select
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import EvidencePack, Finding, Match
from ledgertrace.detect.base import get_job
from ledgertrace.replay.engine import (RollForward, rollforward_path,
    implied_opening_cash_cents, opening_basis)

DISCLAIMER = (
    "Does not post to the general ledger. "
    "Does not certify GAAP, IFRS, or SOX. "
    "Findings are integrity tests for professional review."
)
REVIEW_NOTE = "Human decides whether to post a PY or current-period adjustment. LedgerTrace will not post."


def evidence_path(job_id: str) -> Path:
    return rollforward_path(job_id).with_name("evidence.json").resolve()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(mode="wb", dir=path.parent, prefix=".evidence-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def write_evidence_json(session, job_id: str, rf: RollForward) -> EvidencePack:
    job = get_job(session, job_id)
    findings = list(session.scalars(select(Finding).where(Finding.job_id == job_id)
                                   .order_by(Finding.detector_id, Finding.id)))
    matches = list(session.scalars(select(Match).where(Match.job_id == job_id).order_by(Match.id)))
    rollforward = asdict(rf)
    rollforward.update(implied_opening_cents=implied_opening_cash_cents(session, job_id),
                       opening_basis=opening_basis(session, job_id)[0])
    body = {
        "product": "LedgerTrace",
        "version": job.software_version,
        "disclaimer": DISCLAIMER,
        "job": {
            "id": job.id, "entity_name": job.entity_name, "currency": job.currency,
            "period_start": job.period_start.isoformat(), "period_end": job.period_end.isoformat(),
            "period_close_date": job.period_close_date.isoformat() if job.period_close_date else None,
            "cash_account_ids": json.loads(job.cash_account_ids_json),
            "expected_opening_cash_cents": job.expected_opening_cash_cents,
            "expected_closing_cash_cents": job.expected_closing_cash_cents,
            "input_bank_sha256": job.input_bank_sha256, "input_gl_sha256": job.input_gl_sha256,
            "software_version": job.software_version, "status": job.status,
            "expected_bank_statement_ending_cents": job.expected_bank_statement_ending_cents,
            "export_dialect": job.export_dialect,
        },
        "rollforward": rollforward,
        "matches_summary": {
            "matched": len(matches),
            "unmatched_bank": sum(f.detector_id == "unmatched_bank" and f.severity == "FAIL" for f in findings),
            "unmatched_gl": sum(f.detector_id == "unmatched_gl" and f.severity == "FAIL" for f in findings),
            "methods": dict(sorted(Counter(m.method for m in matches).items())),
        },
        "findings": [{
            "id": f.id, "detector_id": f.detector_id, "severity": f.severity,
            "title": f.title, "amount_cents": f.amount_cents,
            "cite_bank_ids": json.loads(f.cite_bank_ids_json),
            "cite_line_ids": json.loads(f.cite_line_ids_json),
            "cite_entry_ids": json.loads(f.cite_entry_ids_json),
            "payload": json.loads(f.payload_json),
        } for f in findings],
        "proposed_draft_jes": build_draft_jes(session, job_id),
        "draft_disclaimer": DRAFT_DISCLAIMER,
        "proposed_review_actions": [dict(kind="inspect", finding_id=f.id, note=REVIEW_NOTE)
                                    for f in findings if f.severity == "FAIL"],
    }
    data = (json.dumps(body, indent=2, ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")
    path = evidence_path(job_id)
    identifier = scoped_id(job_id, "evidence")
    pack = session.get(EvidencePack, identifier)
    if pack is None:
        pack = EvidencePack(id=identifier, job_id=job_id)
        session.add(pack)
    pack.json_path = str(path)
    pack.pdf_path = ""
    pack.created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.flush()
    atomic_write(path, data)
    return pack
