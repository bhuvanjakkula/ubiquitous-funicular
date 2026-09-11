"""Replay, run D1/D2/D3/D4/D5, and commit their proposals and findings."""
from collections import Counter
from sqlalchemy import func, select
from ledgertrace.db.models import Match
from ledgertrace.replay.engine import replay_job
from .base import DETECTOR_IDS, get_job, persist_findings
from .beginning_balance import run_d1
from .edited_after_clear import run_d2
from .duplicate_event import run_d3
from .period_mutation import run_d5
from .unmatched_bank import run_d4


def run_integrity(session, job_id) -> dict:
    # Replay commits its own checkpoint. Detection is a separate transaction.
    replay_job(session, job_id)
    try:
        findings = run_d1(session, job_id) + run_d2(session, job_id) + run_d3(session, job_id) + run_d4(session, job_id) + run_d5(session, job_id)
        persist_findings(session, job_id, findings, detector_ids=DETECTOR_IDS)
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
