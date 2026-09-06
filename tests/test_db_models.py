from datetime import date, datetime
from pathlib import Path
import re

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import CheckConstraint, Integer, Text, UniqueConstraint, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ledgertrace.db.base import Base
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import (
    Job, BankLine, JournalEntry, JournalLine, ReconEvent, EditEvent,
    ReplayBalance, Match, Finding, EvidencePack,
)
from ledgertrace.db.session import engine_from_url

ROOT = Path(__file__).resolve().parents[1]
TABLES = {
    "jobs", "bank_lines", "journal_entries", "journal_lines", "recon_events",
    "edit_events", "replay_balances", "matches", "findings", "evidence_packs",
}
DAY = date(2025, 1, 1)
STAMP = datetime(2025, 1, 1, 12, 0)


def migration_config(url):
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return config


@pytest.fixture
def engine(tmp_path):
    url = "sqlite:///" + (tmp_path / "ledgertrace.db").as_posix()
    command.upgrade(migration_config(url), "head")
    engine = engine_from_url(url)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine, expire_on_commit=False, autoflush=False) as session:
        yield session


def job():
    return Job(
        id="job-1", entity_name="Acme LLC", period_start=DAY,
        period_end=date(2025, 12, 31), cash_account_ids_json='["1000"]',
        status="queued", software_version="0.1.0",
    )


def bank(parent):
    return BankLine(
        id=scoped_id(parent.id, "B1"), job=parent, source_id="B1",
        posted_date=DAY, amount_cents=-1999, currency="USD",
        description="Bank charge", file_row=2,
    )


def journal(session, debit=500, credit=0):
    parent = job()
    entry = JournalEntry(
        id=scoped_id(parent.id, "J1"), job=parent, source_journal_id="J1",
        txn_date=DAY, created_at=STAMP, modified_at=STAMP, file_row_first=2,
    )
    session.add_all([parent, entry])
    session.flush()
    line = JournalLine(
        id=scoped_id(parent.id, "L1"), job=parent, entry=entry,
        source_line_id="L1", account_id="1000", debit_cents=debit,
        credit_cents=credit, file_row=2,
    )
    session.add(line)
    return parent, entry, line


def test_alembic_upgrade_creates_tables(tmp_path):
    path = tmp_path / "migrated.db"
    url = "sqlite:///" + path.as_posix()
    config = migration_config(url)
    command.upgrade(config, "head")
    assert path.is_file() and path.read_bytes().startswith(b"SQLite format 3")
    engine = engine_from_url(url)
    inspector = inspect(engine)
    assert set(inspector.get_table_names()) == TABLES | {"alembic_version"}
    assert set(Base.metadata.tables) == TABLES
    for name, model_table in Base.metadata.tables.items():
        actual = {c["name"]: c for c in inspector.get_columns(name)}
        assert set(actual) == set(model_table.columns.keys())
        for column in model_table.columns:
            assert actual[column.name]["nullable"] == column.nullable
            if column.name.endswith("_cents"):
                assert isinstance(actual[column.name]["type"], Integer)
            if column.primary_key and name != "replay_balances":
                assert isinstance(actual[column.name]["type"], Text)
        checks = {c.name: str(c.sqltext) for c in model_table.constraints if isinstance(c, CheckConstraint)}
        normalized = lambda s: re.sub(r"\s+", "", s).lower()
        actual_checks = {c["name"]: c["sqltext"] for c in inspector.get_check_constraints(name)}
        assert {k: normalized(v) for k,v in actual_checks.items()} == {k: normalized(v) for k,v in checks.items()}
        uniques = {tuple(c.columns.keys()) for c in model_table.constraints if isinstance(c, UniqueConstraint)}
        assert {tuple(c["column_names"]) for c in inspector.get_unique_constraints(name)} == uniques
        indexes = {i.name: tuple(i.columns.keys()) for i in model_table.indexes}
        assert {i["name"]: tuple(i["column_names"]) for i in inspector.get_indexes(name)} == indexes
        assert all(f["options"].get("ondelete") == "CASCADE" for f in inspector.get_foreign_keys(name))
    with engine.connect() as connection:
        assert connection.scalar(text("PRAGMA integrity_check")) == "ok"
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0001"
    engine.dispose()
    command.downgrade(config, "base")
    engine = engine_from_url(url)
    assert set(inspect(engine).get_table_names()) == {"alembic_version"}
    engine.dispose()
    command.upgrade(config, "head")
    engine = engine_from_url(url)
    assert set(inspect(engine).get_table_names()) == TABLES | {"alembic_version"}
    engine.dispose()


def test_job_and_bank_line_roundtrip(session):
    parent = job()
    row = bank(parent)
    session.add(parent)
    session.commit()
    session.expunge_all()
    persisted = session.scalar(select(BankLine).where(BankLine.id == row.id))
    assert persisted.amount_cents == -1999
    assert persisted.job.entity_name == "Acme LLC"
    assert persisted.job.currency == "USD" and persisted.type == "OTHER"
    assert persisted.job.input_bank_sha256 is None
    assert persisted.job.input_gl_sha256 is None
    assert persisted.created_in_system_at.tzinfo is None
    assert persisted.posted_date == DAY


def test_journal_line_rejects_both_debit_and_credit(session):
    journal(session, debit=100, credit=100)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_journal_line_allows_debit_only(session):
    parent, entry, line = journal(session, debit=500, credit=0)
    session.commit()
    assert session.get(JournalLine, line.id).debit_cents == 500
    assert line.entry is entry and entry.lines == [line]
    assert line in parent.journal_lines and entry in parent.journal_entries
    assert entry.source == "UNKNOWN" and entry.is_void is False


def test_replay_balance_unique(session):
    parent = job()
    session.add(parent)
    session.flush()
    session.add_all([
        ReplayBalance(job=parent, account_id="1000", as_of_date=DAY, balance_cents=500),
        ReplayBalance(job=parent, account_id="1000", as_of_date=DAY, balance_cents=600),
    ])
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


@pytest.mark.parametrize("confidence", [-1, 101])
def test_match_confidence_bounds(session, confidence):
    parent, _, line = journal(session)
    row = bank(parent)
    session.add(row)
    session.flush()
    session.add(Match(id="M1", job=parent, bank_line_id=row.id,
                      journal_line_id=line.id, method="exact_amount_date", confidence=confidence))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


@pytest.mark.parametrize("load_children", [False, True])
def test_delete_job_cascades_bank_lines(session, load_children):
    parent, entry, line = journal(session)
    row = bank(parent)
    session.add(row)
    session.flush()
    session.add_all([
        ReconEvent(id="R1", job=parent, journal_line_id=line.id, event_type="cleared", event_date=DAY),
        EditEvent(id="E1", job=parent, subject_type="journal_entry", subject_id=entry.id, modified_at=STAMP),
        ReplayBalance(job=parent, account_id="1000", as_of_date=DAY, balance_cents=500),
        Match(id="M1", job=parent, bank_line_id=row.id, journal_line_id=line.id, method="manual", confidence=100),
        Finding(id="F1", job=parent, detector_id="test", severity="INFO", title="Database test"),
        EvidencePack(id="P1", job=parent, json_path="example.json", pdf_path="example.pdf", created_at=STAMP),
    ])
    session.commit()
    session.expunge_all()
    parent = session.get(Job, "job-1")
    if load_children:
        for relationship in inspect(Job).relationships:
            assert len(getattr(parent, relationship.key)) == 1
        assert len(parent.journal_entries[0].lines) == 1
    session.delete(parent)
    session.commit()
    for table in TABLES:
        assert session.scalar(text(f'SELECT COUNT(*) FROM "{table}"')) == 0


def test_finding_severity_check(session):
    parent = job()
    session.add(parent)
    session.flush()
    session.add(Finding(id="F1", job=parent, detector_id="test", severity="FAILS", title="Invalid severity"))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_session_helpers_commit_and_rollback(tmp_path):
    from ledgertrace.db import session as db
    url = "sqlite:///" + (tmp_path / "session.db").as_posix()
    command.upgrade(migration_config(url), "head")
    engine = db.init_engine(url)
    try:
        assert db.SessionLocal.kw["expire_on_commit"] is False
        assert db.SessionLocal.kw["autoflush"] is False
        with db.get_session() as session:
            assert session.scalar(text("PRAGMA foreign_keys")) == 1
            session.add(job())
        with pytest.raises(RuntimeError):
            with db.get_session() as session:
                session.add(bank(session.get(Job, "job-1")))
                session.flush()
                raise RuntimeError("Rollback test")
        with db.get_session() as session:
            assert session.get(Job, "job-1") is not None
            assert session.scalar(select(BankLine)) is None
    finally:
        engine.dispose()
        db.init_engine()
