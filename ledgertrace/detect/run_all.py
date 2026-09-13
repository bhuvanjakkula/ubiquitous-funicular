"""Full integrity pipeline with an atomic JSON workpaper replacement."""
from sqlalchemy import func, select
from ledgertrace.db.models import Job, Finding, Match
from ledgertrace.evidence.pack import atomic_write, evidence_path, write_evidence_json
from ledgertrace.replay.engine import replay_job
from ledgertrace.evidence.pdf import write_evidence_pdf
from .base import DETECTOR_IDS, persist_findings
from .beginning_balance import run_d1
from .edited_after_clear import run_d2
from .duplicate_event import run_d3
from .unmatched_bank import run_d4
from .period_mutation import run_d5


class RunError(ValueError):
    pass


def counts_by_severity_and_detector(session, job_id):
    totals = {s: 0 for s in ("FAIL", "UNKNOWN", "INFO")}
    detectors = {}
    rows = session.execute(select(Finding.detector_id, Finding.severity, func.count())
        .where(Finding.job_id == job_id).group_by(Finding.detector_id, Finding.severity)
        .order_by(Finding.detector_id, Finding.severity))
    for detector, severity, count in rows:
        totals[severity] += count
        detectors.setdefault(detector, {s: 0 for s in totals})[severity] = count
    return {"by_severity": totals, "by_detector": detectors}


def run_all(session, job_id: str) -> dict:
    """Replay -> D1..D5 -> findings/matches -> evidence -> commit detected.

    Dedicated local session; run one writer per job at a time. Replay remains
    a committed checkpoint. Later failures roll back detector writes and restore
    the previous evidence file. Does not delete ingest's unbalanced_entry.
    """
    job = session.get(Job, job_id)
    if job is None:
        raise RunError("job not found")
    if job.status == "failed":
        raise RunError("cannot run failed job")
    rf = replay_job(session, job_id)
    path = evidence_path(job_id)
    previous = path.read_bytes() if path.exists() else None
    pdf_path = path.with_suffix(".pdf")
    previous_pdf = pdf_path.read_bytes() if pdf_path.exists() else None
    writing = False
    try:
        findings = (run_d1(session, job_id) + run_d2(session, job_id) + run_d3(session, job_id)
                    + run_d4(session, job_id) + run_d5(session, job_id))
        persist_findings(session, job_id, findings, detector_ids=DETECTOR_IDS)
        job.status = "detected"
        session.flush()
        writing = True
        pack = write_evidence_json(session, job_id, rf)
        write_evidence_pdf(pack)
        session.flush()
        counts = counts_by_severity_and_detector(session, job_id)
        result = {
            "job_id": job_id, "status": job.status,
            "finding_counts": counts["by_severity"],
            "finding_counts_by_detector": counts["by_detector"],
            "matches": session.scalar(select(func.count()).select_from(Match).where(Match.job_id == job_id)),
            "evidence_json": pack.json_path,
            "evidence_pdf": pack.pdf_path,
        }
        session.commit()
        return result
    except Exception:
        session.rollback()
        if writing:
            for artifact, old in ((path, previous), (pdf_path, previous_pdf)):
                if old is None:
                    artifact.unlink(missing_ok=True)
                elif not artifact.exists() or artifact.read_bytes() != old:
                    atomic_write(artifact, old)
        raise
