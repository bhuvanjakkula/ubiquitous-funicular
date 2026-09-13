import csv
import io
import re
from datetime import date, datetime
from pathlib import Path
from .aliases import resolve_headers
from .errors import IngestError

TRUE = {"c", "✓","1", "true", "t", "yes", "y", "x", "r", "cleared", "reconciled"}
FALSE = {"0", "false", "f", "no", "n", "", "unchecked"}


def parse_bool(raw):
    value = raw.strip().lower()
    if value in TRUE: return True
    if value in FALSE: return False
    raise ValueError("invalid boolean: " + raw)


def parse_date(raw):
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return date.fromisoformat(raw)
    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", raw):
        month, day, year = map(int, raw.split("/"))
        return date(year, month, day)
    raise ValueError("expected YYYY-MM-DD or M/D/YYYY date")


def parse_datetime(raw):
    if "T" not in raw:
        return datetime.combine(parse_date(raw), datetime.min.time())
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", raw):
        raise ValueError("expected timezone-naive YYYY-MM-DDTHH:MM:SS (UTC)")
    return datetime.fromisoformat(raw)


def required(raw):
    if not raw.strip(): raise ValueError("required value is blank")
    return raw


def read_rows(path, aliases, required_fields, amount_fields, data=None):
    path = Path(path)
    try:
        snapshot = path.read_bytes() if data is None else data
        reader = csv.DictReader(io.StringIO(snapshot.decode("utf-8-sig"), newline=""), strict=True)
        headers = reader.fieldnames or []
        mapping = resolve_headers(headers, aliases)
        missing = sorted(set(required_fields) - mapping.keys())
        if not any(field in mapping for field in amount_fields):
            missing.append(" or ".join(amount_fields))
        if missing:
            raise IngestError([{"file": path.name, "row": 0, "message": "missing logical fields: " + ", ".join(missing), "found_headers": headers, "missing_fields": missing}])
        rows = []
        errors = []
        for number, raw in enumerate(reader, 1):
            if None in raw or any(value is None for value in raw.values()):
                errors.append({"file": path.name, "row": number, "message": "CSV row width does not match headers"})
                continue
            rows.append((number, {logical: raw[original].strip() for logical, original in mapping.items()}, raw))
        return rows, mapping, errors
    except IngestError:
        raise
    except (OSError, UnicodeError, csv.Error) as error:
        raise IngestError([{"file": path.name, "row": 0, "message": str(error)}]) from error


class RowParser:
    def __init__(self, path, row, errors):
        self.path, self.row, self.errors = Path(path).name, row, errors

    def get(self, field, raw, parse, default=None):
        try:
            return parse(raw)
        except (ValueError, TypeError, OverflowError) as error:
            self.errors.append({"file": self.path, "row": self.row, "field": field, "message": str(error)})
            return default
