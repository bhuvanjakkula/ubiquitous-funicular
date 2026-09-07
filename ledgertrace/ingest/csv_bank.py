from pathlib import Path
from ledgertrace.money import LIMIT
from .aliases import BANK_ALIASES, norm_header
from .common import read_rows, RowParser, parse_date, required
from .parse_money import parse_amount_to_cents, parse_optional_cents
from .errors import IngestError


def parse_bank(path, currency="USD", *, data=None):
    rows, mapping, errors = read_rows(path, BANK_ALIASES, {"posted_date", "description"}, ("amount", "debit", "credit"), data)
    split = {"debit", "credit"} <= mapping.keys() or "amount" not in mapping
    result, seen = [], set()
    for number, row, raw in rows:
        if not any(row.get(k) for k in ("posted_date", "amount", "debit", "credit", "description")):
            continue
        before = len(errors)
        parser = RowParser(path, number, errors)
        sid = row.get("bank_line_id") or f"{Path(path).stem}#{number}"
        if sid in seen:
            errors.append({"file": Path(path).name, "row": number, "message": "duplicate source_id: " + sid})
        seen.add(sid)
        posted = parser.get("posted_date", row.get("posted_date", ""), parse_date)
        desc = parser.get("description", row.get("description", ""), required)
        if split:
            debit = parser.get("debit", row.get("debit", ""), parse_optional_cents, 0)
            credit = parser.get("credit", row.get("credit", ""), parse_optional_cents, 0)
            if min(debit, credit) < 0:
                errors.append({"file": Path(path).name, "row": number, "message": "bank debit/credit must be nonnegative"})
            amount = credit - debit
        else:
            amount = parser.get("amount", row.get("amount", ""), parse_amount_to_cents, 0)
        value_date = parser.get("value_date", row["value_date"], parse_date) if row.get("value_date") else None
        if abs(amount) > LIMIT:
            errors.append({"file": Path(path).name, "row": number, "message": "amount exceeds integer range"})
        if len(errors) == before:
            result.append(dict(source_id=sid, posted_date=posted, value_date=value_date, amount_cents=amount,
                currency=row.get("currency") or currency, description=desc, account_ref=row.get("account_ref") or None,
                fitid=next((v.strip() or None for k,v in raw.items() if norm_header(k)=="fitid"), None),
                type=row.get("type") or "OTHER", check_number=row.get("check_number") or None, file_row=number))
    if errors: raise IngestError(errors)
    return result
