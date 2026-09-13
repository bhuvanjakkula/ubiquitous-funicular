"""Offline demo: isolated temporary SQLite, persistent local workpapers."""
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy.orm import Session
from ledgertrace.db.base import Base
from ledgertrace.db.session import engine_from_url
from ledgertrace.ingest.service import ingest_job
from ledgertrace.ingest.job_config import load_job_config
from ledgertrace.detect.run_all import run_all


def main():
    root = Path(__file__).resolve().parents[1]
    artifacts = root / "data" / "demo"
    artifacts.mkdir(parents=True, exist_ok=True)
    os.environ["LEDGERTRACE_DATA_DIR"] = str(artifacts)
    fixture = root / "tests/fixtures/happy"
    with TemporaryDirectory(dir=artifacts) as temporary:
        engine = engine_from_url("sqlite:///" + (Path(temporary) / "demo.db").as_posix())
        Base.metadata.create_all(engine)
        with Session(engine, expire_on_commit=False, autoflush=False) as session:
            job = ingest_job(session, fixture / "bank.csv", fixture / "gl.csv", load_job_config(fixture / "job.json"))
            result = run_all(session, job.id)
            print(f"ending=125000 matches={result['matches']} fail={result['finding_counts']['FAIL']} json={result['evidence_json']} pdf={result['evidence_pdf']}")
        engine.dispose()


if __name__ == "__main__": main()
