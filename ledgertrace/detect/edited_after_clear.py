"""D2: compare entry edit dates to each cleared line's clear date."""
from ledgertrace.ingest.metadata import load_metadata
from .base import get_job, source_rows, citations, finding


def run_d2(session, job_id):
    job = get_job(session, job_id)
    banks, pairs = source_rows(session, job_id)
    metadata = load_metadata(job)
    def emit(suffix, severity, title, rows=pairs, payload=None):
        return finding(suffix, detector_id="edited_after_clear", severity=severity,
                       title=title, payload=payload or {}, **citations(pairs=rows, banks=banks if not rows else ()))
    if not metadata or "modified_at" not in metadata["columns"]:
        return [emit("timestamps", "UNKNOWN", "edit timestamps not present in export; cannot test cleared-line mutation.")]
    if not {"cleared_flag", "cleared_date"} & set(metadata["columns"]):
        return [emit("clearing", "UNKNOWN", "Clearing columns not present in export; cannot identify cleared lines")]
    missing_rows = set(metadata["missing"]["created_at"]) | set(metadata["missing"]["modified_at"])
    incomplete_entries = {
        entry.id for line, entry in pairs
        if line.file_row in missing_rows
    }
    result = []
    for line, entry in pairs:
        if not (line.cleared_flag or line.cleared_date is not None):
            continue
        payload = dict(cleared_date=line.cleared_date.isoformat() if line.cleared_date else None,
                       modified_at=entry.modified_at.isoformat(), created_at=entry.created_at.isoformat(),
                       debit=line.debit_cents, credit=line.credit_cents, account_id=line.account_id)
        if line.cleared_date is None:
            result.append(emit(line.id, "UNKNOWN", "Cleared line has no cleared date", [(line, entry)], payload))
        elif entry.id in incomplete_entries:
            result.append(emit(line.id, "UNKNOWN", "Cleared-line timestamps incomplete in export", [(line, entry)], payload))
        elif entry.modified_at.date() > line.cleared_date and entry.modified_at.date() != entry.created_at.date():
            result.append(emit(line.id, "FAIL", "Cleared line later modified", [(line, entry)], payload))
    return result
