"""D5: period entries modified or created strictly after the close date.

Void entries remain timestamp evidence. Only txn_date <= period_end is used;
pre-period entries are included. Creation and modification are separate checks.
"""
from ledgertrace.ingest.metadata import load_metadata
from .base import get_job, source_rows, citations, finding


def run_d5(session, job_id):
    job = get_job(session, job_id)
    banks, pairs = source_rows(session, job_id)
    def emit(suffix, severity, title, rows=pairs, payload=None):
        return finding(suffix, detector_id="period_mutation_after_close", severity=severity,
                       title=title, payload=payload or {}, **citations(pairs=rows, banks=banks if not rows else ()))
    if job.period_close_date is None:
        return [emit("close", "UNKNOWN", "Period close date not provided")]
    metadata = load_metadata(job)
    if metadata is None:
        return [emit("timestamps", "UNKNOWN", "Timestamp source metadata unavailable; cannot test period mutation")]
    result = []
    absent = [f for f in ("modified_at", "created_at") if f not in metadata["columns"]]
    if absent:
        result.append(emit("timestamps", "UNKNOWN", "Timestamp columns not present in export; period mutation checks incomplete", payload={"missing_columns": absent}))
    missing_rows = {field: set(rows) for field, rows in metadata["missing"].items()}
    entries = {}
    for line, entry in pairs:
        if entry.txn_date <= job.period_end:
            entries.setdefault(entry.id, []).append((line, entry))
    for rows in entries.values():
        entry = rows[0][1]
        for field, title in (("modified_at", "Period books mutated after close date"), ("created_at", "Backdated entry created after close")):
            if field in absent:
                continue
            payload = dict(txn_date=entry.txn_date.isoformat(), period_close_date=job.period_close_date.isoformat(),
                           journal_id=entry.source_journal_id, **{field: getattr(entry, field).isoformat()})
            if any(l.file_row in missing_rows[field] for l, _ in rows):
                result.append(emit(entry.id + ":" + field, "UNKNOWN", field + " incomplete in export", rows, payload))
            elif getattr(entry, field).date() > job.period_close_date:
                result.append(emit(entry.id + ":" + field, "FAIL", title, rows, payload))
    return result
