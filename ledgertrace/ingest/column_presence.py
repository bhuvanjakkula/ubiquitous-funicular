"""Source timestamp availability; normalized fallback dates are not evidence."""
import json
import os
from pathlib import Path
import re
from tempfile import NamedTemporaryFile


def metadata_path(job_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", job_id):
        raise ValueError("invalid job_id")
    return Path(os.environ.get("LEDGERTRACE_DATA_DIR", "data")) / "jobs" / job_id / "gl_columns.json"


def write_metadata(job, metadata):
    path = metadata_path(job.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(dict(metadata, version=1, input_gl_sha256=job.input_gl_sha256), stream, sort_keys=True)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def load_metadata(job):
    try:
        value = json.loads(metadata_path(job.id).read_text(encoding="utf-8"))
        if value["version"] != 1 or value["input_gl_sha256"] != job.input_gl_sha256:
            return None
        if not isinstance(value["columns"], list) or not all(isinstance(c, str) for c in value["columns"]):
            return None
        if not isinstance(value["headers_normalized"], list):
            return None
        if any(type(value["resolved"][f]) is not bool for f in ("created_at", "modified_at", "cleared_flag", "cleared_date")):
            return None
        for field in ("created_at", "modified_at"):
            rows = value["missing"][field]
            if not isinstance(rows, list) or any(type(r) is not int or r < 1 for r in rows):
                return None
        return value
    except (OSError, ValueError, KeyError, TypeError):
        return None


load = load_metadata
save = write_metadata
