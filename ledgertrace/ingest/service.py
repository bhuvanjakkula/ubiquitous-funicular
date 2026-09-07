"""Local-file ingestion. Success commits once; failure rolls back all ingest rows."""
import json
from collections import defaultdict
from pathlib import Path
from uuid import uuid4
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import Job, BankLine, JournalEntry, JournalLine, Finding
from ledgertrace.money import LIMIT
from .csv_bank import parse_bank
from .csv_gl import parse_gl
from .errors import IngestError
from .hashing import sha256_bytes
from .job_config import JobConfig


def ingest_job(session, bank_path, gl_path, config: JobConfig) -> Job:
    """Use a dedicated session. Failed attempts do not leave a failed Job row."""
    if session.new or session.dirty or session.deleted:
        raise IngestError("ingest_job requires a session without pending changes")
    try:
        errors, parsed, snapshots = [], {}, {}
        for kind, path, parser in (("bank", bank_path, parse_bank), ("gl", gl_path, parse_gl)):
            try:
                snapshots[kind] = Path(path).read_bytes()
                parsed[kind] = parser(path, config.currency, data=snapshots[kind])
            except IngestError as error:
                errors.extend(error.errors)
            except OSError as error:
                errors.append({"file": str(path), "row": 0, "message": str(error)})
        if errors: raise IngestError(errors)
        job_id = uuid4().hex
        values = config.model_dump(exclude={"cash_account_ids"})
        job = Job(id=job_id, status="queued", cash_account_ids_json=json.dumps(config.cash_account_ids),
                  input_bank_sha256=sha256_bytes(snapshots["bank"]), input_gl_sha256=sha256_bytes(snapshots["gl"]), **values)
        session.add(job)
        session.flush()
        for row in parsed["bank"]:
            session.add(BankLine(id=scoped_id(job_id, row["source_id"]), job_id=job_id, **row))
        grouped = defaultdict(list)
        for row in parsed["gl"]: grouped[row["source_journal_id"]].append(row)
        for jid, rows in grouped.items():
            first = rows[0]
            first_nonempty = lambda key: next((r[key] for r in rows if r[key]), None)
            earliest = min(rows, key=lambda r: (r["created_at"], r["file_row"]))
            latest = max(rows, key=lambda r: (r["modified_at"], r["file_row"]))
            reverses = first_nonempty("reverses_journal_id")
            entry = JournalEntry(id=scoped_id(job_id, jid), job_id=job_id, source_journal_id=jid,
                txn_date=first["txn_date"], created_at=earliest["created_at"], modified_at=latest["modified_at"],
                created_by=earliest["created_by"], modified_by=latest["modified_by"],
                source=first_nonempty("source") or "UNKNOWN", memo=first_nonempty("memo"),
                is_void=any(r["is_void"] for r in rows), reverses_id=scoped_id(job_id, reverses) if reverses else None,
                file_row_first=min(r["file_row"] for r in rows))
            session.add(entry)
            session.flush()
            line_ids = []
            for row in rows:
                lid = scoped_id(job_id, row["source_line_id"])
                line_ids.append(lid)
                fields = {key: row[key] for key in ("source_line_id", "account_id", "account_name", "debit_cents", "credit_cents", "cleared_flag", "cleared_date", "recon_id", "file_row")}
                session.add(JournalLine(id=lid, job_id=job_id, entry_id=entry.id, **fields))
            debit = sum(r["debit_cents"] for r in rows)
            credit = sum(r["credit_cents"] for r in rows)
            difference = abs(debit - credit)
            if difference > LIMIT: raise IngestError("unbalanced amount exceeds SQLite integer range for journal " + jid)
            if difference:
                session.add(Finding(id=scoped_id(job_id, f"unbalanced_entry:{jid}"), job_id=job_id,
                    detector_id="unbalanced_entry", severity="FAIL", title=f"Journal {jid} does not balance",
                    amount_cents=difference, cite_entry_ids_json=json.dumps([entry.id]),
                    cite_line_ids_json=json.dumps(line_ids), cite_bank_ids_json="[]",
                    payload_json=json.dumps({"debit_cents": debit, "credit_cents": credit, "source_journal_id": jid})))
        job.status = "ingested"
        session.commit()
        return job
    except Exception as error:
        session.rollback()
        if isinstance(error, IngestError): raise
        raise IngestError(str(error)) from error
