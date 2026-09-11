"""Replay, run just D1/D4, and commit their proposals and findings."""
from collections import Counter
from sqlalchemy import func, select
from ledgertrace.db.models import Match
from ledgertrace.replay.engine import replay_job
from .base import D1_D4_IDS, get_job, persist_findings
from .beginning_balance import run_d1
from .unmatched_bank import run_d4


def run_d1_d4(session, job_id) -> dict:
    # Replay commits its own checkpoint. Detection is a separate transaction.
    replay_job(session, job_id)
    try:
        findings = run_d1(session, job_id) + run_d4(session, job_id)
        persist_findings(session, job_id, findings, detector_ids=D1_D4_IDS)
        job = get_job(session, job_id)
        job.status = "detected"
        matches = session.scalar(select(func.count()).select_from(Match).where(Match.job_id == job_id))
        counts = Counter(f.severity for f in findings)
        result = {"job_id": job_id, "status": "detected", "matches": matches,
                  "finding_counts": {severity: counts[severity] for severity in ("FAIL", "UNKNOWN", "INFO")}}
        session.commit()
        return result
    except Exception:
        session.rollback()
        raise
