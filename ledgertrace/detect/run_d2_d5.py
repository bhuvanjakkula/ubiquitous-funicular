"""Run only timestamp detectors; preserve replay, matches and other findings."""
from collections import Counter
from .base import D2_D5_IDS, get_job, persist_findings
from .edited_after_clear import run_d2
from .period_mutation import run_d5


def run_d2_d5(session, job_id):
    try:
        session.flush()
        results = run_d2(session, job_id) + run_d5(session, job_id)
        persist_findings(session, job_id, results, detector_ids=D2_D5_IDS)
        job = get_job(session, job_id)
        job.status = "detected"
        counts = Counter(f.severity for f in results)
        output = dict(job_id=job_id, status=job.status,
                      finding_counts={s: counts[s] for s in ("FAIL", "UNKNOWN", "INFO")})
        session.commit()
        return output
    except Exception:
        session.rollback()
        raise
