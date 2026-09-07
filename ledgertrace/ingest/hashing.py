from hashlib import sha256
from pathlib import Path


def sha256_file(path) -> str:
    digest = sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(data: bytes) -> str:
    """Hash the exact byte snapshot passed to the parsers."""
    return sha256(data).hexdigest()
