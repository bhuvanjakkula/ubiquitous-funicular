"""Shared local SQLite fixtures for ingestion tests."""
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from ledgertrace.db.base import Base
from ledgertrace.db.models import Job
from ledgertrace.db.session import engine_from_url
from ledgertrace.ingest.job_config import load_job_config
from ledgertrace.ingest.service import ingest_job

fixtures_dir = Path(__file__).parent / "fixtures"
INGEST_FIXTURES = frozenset({"happy", "d4_unmatched", "unbalanced_je", "alias_headers"})


@pytest.fixture
def engine(tmp_path):
    engine = engine_from_url("sqlite:///" + (tmp_path / "ingest.db").as_posix())
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine, expire_on_commit=False, autoflush=False) as session:
        yield session


def ingest_fixture(name: str, session: Session) -> Job:
    if name not in INGEST_FIXTURES:
        raise ValueError(f"{name} is not an ingest-ready Day 4 fixture")
    folder = fixtures_dir / name
    return ingest_job(
        session, folder / "bank.csv", folder / "gl.csv",
        load_job_config(folder / "job.json"),
    )
