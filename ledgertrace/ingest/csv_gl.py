from pathlib import Path
from .aliases import GL_ALIASES, norm_header
from .common import read_rows, RowParser, parse_date, parse_datetime, parse_bool, required
from .parse_money import parse_optional_cents
from .errors import IngestError


def parse_gl(path, currency="USD", *, aliases=None, data=None, metadata=None):
    rows, mapping, errors = read_rows(path, aliases if aliases is not None else GL_ALIASES, {"journal_id", "txn_date", "account_id"}, ("debit", "credit"), data)
    if metadata is not None:
        # Capture source headers before applying any timestamp defaults.
        import csv
        import io
        source = data if data is not None else Path(path).read_bytes()
        headers = next(csv.reader(io.StringIO(source.decode("utf-8-sig"))))
        metadata.update(headers_normalized=[norm_header(h) for h in headers],
                        resolved={field: field in mapping for field in
                                  ("modified_at", "created_at", "cleared_flag", "cleared_date")},
                        columns=sorted(mapping), missing={
            field: [number for number, row, _ in rows if not row.get(field)]
            for field in ("created_at", "modified_at")})
    result, seen = [], set()
    for number, row, _ in rows:
        before = len(errors)
        parser = RowParser(path, number, errors)
        jid = parser.get("journal_id", row.get("journal_id", ""), required)
        account = parser.get("account_id", row.get("account_id", ""), required)
        txn = parser.get("txn_date", row.get("txn_date", ""), parse_date)
        sid = row.get("line_id") or f"{jid}#{number}"
        if sid in seen:
            errors.append({"file": Path(path).name, "row": number, "message": "duplicate source_line_id: " + sid})
        seen.add(sid)
        debit = parser.get("debit", row.get("debit", ""), parse_optional_cents, 0)
        credit = parser.get("credit", row.get("credit", ""), parse_optional_cents, 0)
        issue = "line has debit and credit" if debit > 0 and credit > 0 else "line has zero debit and credit" if debit == credit == 0 else "line debit/credit must be nonnegative" if min(debit, credit) < 0 else None
        if issue: errors.append({"file": Path(path).name, "row": number, "message": issue})
        created = parser.get("created_at", row.get("created_at") or (txn.isoformat() if txn else ""), parse_datetime)
        modified = parser.get("modified_at", row["modified_at"], parse_datetime) if row.get("modified_at") else created
        cleared = parser.get("cleared_flag", row.get("cleared_flag", ""), parse_bool) if "cleared_flag" in mapping else None
        clear_date = parser.get("cleared_date", row["cleared_date"], parse_date) if row.get("cleared_date") else None
        void = parser.get("is_void", row.get("is_void", ""), parse_bool, False)
        if row.get("currency") and row["currency"] != currency:
            errors.append({"file": Path(path).name, "row": number, "message": "GL currency differs from job currency; no currency translation"})
        if len(errors) == before:
            result.append(dict(source_line_id=sid, source_journal_id=jid, txn_date=txn, account_id=account,
                account_name=row.get("account_name") or None, debit_cents=debit, credit_cents=credit,
                created_at=created, modified_at=modified, created_by=row.get("created_by") or None,
                modified_by=row.get("modified_by") or None, memo=row.get("memo") or None,
                source=row.get("source") or None, cleared_flag=cleared, cleared_date=clear_date,
                recon_id=row.get("recon_id") or None, is_void=void,
                reverses_journal_id=row.get("reverses_journal_id") or None, file_row=number))
    if errors: raise IngestError(errors)
    return result
