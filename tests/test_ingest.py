import hashlib
import json
from datetime import date, datetime
from pathlib import Path
import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session
from ledgertrace.db.base import Base
from ledgertrace.db.models import Job, BankLine, JournalEntry, JournalLine, Finding
from ledgertrace.db.session import engine_from_url
from ledgertrace.ingest.aliases import norm_header, resolve_headers, BANK_ALIASES
from ledgertrace.ingest.csv_bank import parse_bank
from ledgertrace.ingest.csv_gl import parse_gl
from ledgertrace.ingest.hashing import sha256_file
from ledgertrace.ingest.job_config import JobConfig, load_job_config
from ledgertrace.ingest.parse_money import parse_amount_to_cents
from ledgertrace.ingest.service import ingest_job, IngestError

FIXTURES = Path(__file__).parent / "fixtures"

@pytest.fixture
def session(tmp_path):
    engine = engine_from_url("sqlite:///" + (tmp_path / "ingest.db").as_posix())
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False, autoflush=False) as session:
        yield session
    engine.dispose()


def ingest(session, name="happy", bank=None, gl=None):
    folder = FIXTURES / name
    return ingest_job(session, bank or folder / "bank.csv", gl or folder / "gl.csv", load_job_config(folder / "job.json"))


def write(tmp_path, name, content):
    p = tmp_path / name
    p.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
    return p


def count(session, model):
    return session.scalar(select(func.count()).select_from(model))


def assert_empty(session):
    for model in [Job, BankLine, JournalEntry, JournalLine, Finding]:
        assert count(session, model) == 0


def test_happy_ingest_counts(session):
    job = ingest(session)
    assert [count(session, model) for model in [BankLine, JournalEntry, JournalLine, Finding]] == [3, 3, 6, 0]
    assert job.status == "ingested"
    assert len(job.input_bank_sha256) == len(job.input_gl_sha256) == 64
    assert job.input_bank_sha256 == sha256_file(FIXTURES / "happy/bank.csv")
    assert job.input_gl_sha256 == sha256_file(FIXTURES / "happy/gl.csv")
    assert len(job.id) == 32 and int(job.id, 16) >= 0
    assert json.loads(job.cash_account_ids_json) == ["1000"]


def test_happy_cents(session):
    job = ingest(session)
    assert session.get(BankLine, f"{job.id}:b1").amount_cents == 50000
    assert session.get(BankLine, f"{job.id}:b2").amount_cents == -20000
    line = session.get(JournalLine, f"{job.id}:l1")
    assert (line.debit_cents, line.credit_cents) == (50000, 0)


def test_ids_are_scoped(session):
    job = ingest(session)
    assert session.scalar(select(BankLine).where(BankLine.source_id == "b1")).id == f"{job.id}:b1"
    assert session.scalar(select(JournalEntry).where(JournalEntry.source_journal_id == "j1")).id == f"{job.id}:j1"
    assert session.scalar(select(JournalLine).where(JournalLine.source_line_id == "l1")).id == f"{job.id}:l1"


def test_unbalanced_entry_finding(session):
    job = ingest(session, "unbalanced_je")
    assert count(session, Finding) == 1
    finding = session.scalar(select(Finding))
    assert finding.detector_id == "unbalanced_entry" and finding.severity == "FAIL"
    assert finding.amount_cents == 6000
    assert finding.id == f"{job.id}:unbalanced_entry:bad1"
    assert json.loads(finding.cite_entry_ids_json) == [f"{job.id}:bad1"]
    assert json.loads(finding.cite_line_ids_json) == [f"{job.id}:x1", f"{job.id}:x2"]
    assert json.loads(finding.cite_bank_ids_json) == []
    assert json.loads(finding.payload_json) == {"debit_cents": 10000, "credit_cents": 4000, "source_journal_id": "bad1"}
    assert count(session, JournalEntry) == 1 and count(session, JournalLine) == 2
    assert job.status == "ingested"


def test_alias_bank_headers(session):
    job = ingest(session, bank=FIXTURES / "alias_bank.csv")
    rows = list(session.scalars(select(BankLine).order_by(BankLine.file_row)))
    assert [(r.source_id, r.amount_cents, r.fitid) for r in rows] == [("fit-1", -1200, "fit-1"), ("fit-2", 9000, "fit-2")]


def test_missing_gl_journal_header_raises(session, tmp_path):
    gl = write(tmp_path, "bad.csv", "Date,Account,Debit,Credit\n2025-01-01,1000,1,0\n")
    with pytest.raises(IngestError) as error:
        ingest(session, gl=gl)
    assert error.value.errors[0]["found_headers"] == ["Date", "Account", "Debit", "Credit"]
    assert "journal_id" in error.value.errors[0]["missing_fields"]
    assert_empty(session)


def test_parentheses_amount(session, tmp_path):
    bank = write(tmp_path, "bank.csv", "Date,Amount,Memo\n2025-01-01,(25.10),Charge\n")
    ingest(session, bank=bank)
    assert session.scalar(select(BankLine)).amount_cents == -2510


def test_hash_changes_when_file_changes(session, tmp_path):
    first = ingest(session)
    raw = (FIXTURES / "happy/bank.csv").read_bytes()
    changed = write(tmp_path, "changed.csv", raw.replace(b"Customer deposit", b"Customer deposit "))
    second = ingest(session, bank=changed)
    assert first.input_bank_sha256 != second.input_bank_sha256
    assert second.input_bank_sha256 == hashlib.sha256(changed.read_bytes()).hexdigest()
    assert first.input_gl_sha256 == second.input_gl_sha256


def test_both_debit_and_credit_on_one_gl_line_raises(session, tmp_path):
    gl = write(tmp_path, "bad.csv", "journal_id,txn_date,account_id,debit,credit\nJ,2025-01-01,1000,10,10\n")
    with pytest.raises(IngestError, match="line has debit and credit"):
        ingest(session, gl=gl)
    assert_empty(session)


@pytest.mark.parametrize("raw", ["", "1.001", "1e2", "NaN", "--1", 1.25])
def test_money_rejects_invalid_amount(raw):
    with pytest.raises(ValueError):
        parse_amount_to_cents(raw)


def test_money_precision_and_formatting():
    assert parse_amount_to_cents(" $ 1,234.50 ") == 123450
    assert parse_amount_to_cents("90071992547409.93") == 9007199254740993


def test_bank_pair_precedence_and_synthetic_data_row_ids(tmp_path):
    path = write(tmp_path, "statement.csv", "Date,Amount,Withdrawal,Deposit,Payee\n,,,,\n2025-03-01,999,12,,Coffee\n")
    row = parse_bank(path)[0]
    assert row["amount_cents"] == -1200
    assert row["source_id"] == "statement#2" and row["file_row"] == 2
    path = write(tmp_path, "single.csv", "Date,Amount,Withdrawal,Payee\n2025-03-01,7,12,Coffee\n")
    assert parse_bank(path)[0]["amount_cents"] == 700


def test_single_sided_gl_and_default_timestamps(tmp_path):
    gl = write(tmp_path, "gl.csv", "Journal,Date,Acct,Dr\nJ,3/1/2025,1000,25\n")
    row = parse_gl(gl)[0]
    assert row["source_line_id"] == "J#1"
    assert (row["debit_cents"], row["credit_cents"]) == (2500, 0)
    assert row["created_at"] == row["modified_at"] == datetime(2025, 3, 1)


def test_collects_errors_from_both_files_without_partial_job(session, tmp_path):
    bank = write(tmp_path, "bad-bank.csv", "Date,Amount,Description\nno-date,1.999,x\n2025-01-01,,x\n")
    gl = write(tmp_path, "bad-gl.csv", "Journal,Date,Acct,Dr,Cr\nJ,2025-01-01,,10,10\nK,2025-01-01,1000,0,0\n")
    with pytest.raises(IngestError) as error:
        ingest(session, bank=bank, gl=gl)
    assert {e["file"] for e in error.value.errors} == {"bad-bank.csv", "bad-gl.csv"}
    assert len(error.value.errors) >= 6
    assert_empty(session)
    assert ingest(session).status == "ingested"


@pytest.mark.parametrize("kind", ["bank", "gl"])
def test_duplicate_source_ids_are_fatal(session, tmp_path, kind):
    raw = (FIXTURES / "happy" / f"{kind}.csv").read_text()
    raw = raw.replace("b2,", "b1,") if kind == "bank" else raw.replace("l2,", "l1,")
    path = write(tmp_path, f"{kind}.csv", raw)
    with pytest.raises(IngestError, match="duplicate"):
        ingest(session, **{kind: path})
    assert_empty(session)


def test_group_metadata_and_mixed_dates(session, tmp_path):
    gl = write(tmp_path, "gl.csv", "Line,Journal,Date,Acct,Dr,Cr,Created,Updated,Origin,Void,Reverses\na,J,2025-02-02,1000,10,0,2/1/2025,2025-02-04T12:30:00,,no,\nb,J,2025-02-03,4000,0,10,1/31/2025,2025-02-05T09:00:00,MANUAL,yes,OLD\n")
    job = ingest(session, gl=gl)
    entry = session.get(JournalEntry, f"{job.id}:J")
    assert entry.txn_date == date(2025, 2, 2)
    assert entry.created_at == datetime(2025, 1, 31)
    assert entry.modified_at == datetime(2025, 2, 5, 9)
    assert entry.source == "MANUAL" and entry.is_void
    assert entry.reverses_id == f"{job.id}:OLD" and entry.file_row_first == 1
    assert count(session, Finding) == 0


def test_boolean_vocabulary_and_invalid_value(tmp_path):
    from ledgertrace.ingest.common import parse_bool
    for value in ["1", "true", "t", "yes", "y", "x", "r", "cleared", "reconciled"]:
        assert parse_bool(value.upper()) is True
    for value in ["0", "false", "f", "no", "n", "", "unchecked"]:
        assert parse_bool(value) is False
    gl = write(tmp_path, "gl.csv", "Journal,Date,Acct,Dr,Cleared\nJ,2025-01-01,1000,1,maybe\n")
    with pytest.raises(IngestError, match="invalid boolean"):
        parse_gl(gl)


def test_bom_and_deterministic_alias_priority(tmp_path):
    assert norm_header("  POSTED   Date  ") == "posted date"
    mapping = resolve_headers([" Date ", "Posted Date", "posted_date"], BANK_ALIASES)
    assert mapping["posted_date"] == "posted_date"
    raw = b'\xef\xbb\xbf  POSTED   Date  ,Transaction Amount,Narrative\n2025-01-01,1,Test\n'
    path = write(tmp_path, "bom.csv", raw)
    assert parse_bank(path)[0]["amount_cents"] == 100
    assert sha256_file(path) == hashlib.sha256(raw).hexdigest()


def test_persistence_failure_rolls_back_everything(session):
    def fail_insert(*args):
        raise RuntimeError("simulated disk failure")
    event.listen(JournalLine, "before_insert", fail_insert)
    try:
        with pytest.raises(IngestError, match="simulated disk failure"):
            ingest(session)
    finally:
        event.remove(JournalLine, "before_insert", fail_insert)
    assert_empty(session)


def test_config_requirements():
    values = json.loads((FIXTURES / "happy/job.json").read_text())
    for updates in [dict(cash_account_ids=[]), dict(period_end="2024-01-01"), dict(expected_opening_cash_cents=1.1)]:
        with pytest.raises(ValidationError):
            JobConfig(**(values | updates))
