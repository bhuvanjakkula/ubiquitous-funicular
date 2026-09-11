from fastapi import FastAPI
from ledgertrace import __version__

app = FastAPI(title="LedgerTrace", version=__version__)

@app.get("/health")
def health():
    return {"ok": True, "version": __version__}


# Local API only. Ingest remains the existing Python API.
from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ledgertrace.db.session import SessionLocal
from ledgertrace.db.models import Job, EvidencePack
from ledgertrace.db.ids import scoped_id
from ledgertrace.detect.run_all import RunError, run_all
from ledgertrace.detect.base import DetectorError
from ledgertrace.replay.engine import ReplayError
from ledgertrace.evidence.pack import evidence_path


def db_session():
    with SessionLocal() as session:
        yield session


@app.post("/api/jobs/{job_id}/run")
def run_job(job_id: str, session: Session = Depends(db_session)):
    if session.get(Job, job_id) is None:
        raise HTTPException(status_code=404, detail="job not found")
    try:
        return run_all(session, job_id)
    except (RunError, ReplayError, DetectorError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.get("/api/jobs/{job_id}/evidence.json")
def evidence_json(job_id: str, session: Session = Depends(db_session)):
    if session.get(Job, job_id) is None:
        raise HTTPException(status_code=404, detail="job not found")
    pack = session.get(EvidencePack, scoped_id(job_id, "evidence"))
    path = evidence_path(job_id)
    if pack is None or not path.is_file():
        raise HTTPException(status_code=404, detail="evidence JSON not available; run the job first")
    return FileResponse(path, media_type="application/json", filename="evidence.json")
