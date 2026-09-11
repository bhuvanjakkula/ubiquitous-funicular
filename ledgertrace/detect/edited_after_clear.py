"""D2: compare entry edit dates to each cleared line's clear date."""
from ledgertrace.ingest.column_presence import load_metadata
from .base import get_job, source_rows, citations, finding


def run_d2(session, job_id):
    job = get_job(session, job_id)
    banks, pairs = source_rows(session, job_id)
    pairs = [(l, e) for l, e in pairs if not e.is_void]
    metadata = load_metadata(job)
    def emit(suffix, severity, title, rows=pairs, payload=None, amount_cents=None):
        return finding(suffix, detector_id="edited_after_clear", severity=severity,
                       title=title, payload=payload or {}, amount_cents=amount_cents, **citations(pairs=rows, banks=banks if not rows else ()))
    if not metadata or not metadata["resolved"]["modified_at"]:
        return [emit("timestamps", "UNKNOWN", "Edit timestamps not present in export; cannot test cleared-line mutation", payload={"missing": "modified_at"})]
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
                       debit_cents=line.debit_cents, credit_cents=line.credit_cents, account_id=line.account_id,
                       source_line_id=line.source_line_id, source_journal_id=entry.source_journal_id)
        if line.cleared_date is None:
            result.append(emit("nodate:" + line.source_line_id, "UNKNOWN", "Cleared line missing cleared_date", [(line, entry)], {"source_line_id": line.source_line_id}))
        elif entry.id in incomplete_entries:
            result.append(emit(line.id, "UNKNOWN", "Cleared-line timestamps incomplete in export", [(line, entry)], payload))
        elif entry.modified_at.date() > line.cleared_date and entry.modified_at.date() != entry.created_at.date():
            result.append(emit(line.source_line_id, "FAIL", "Cleared line later modified", [(line, entry)], payload, line.debit_cents - line.credit_cents))
    return result
