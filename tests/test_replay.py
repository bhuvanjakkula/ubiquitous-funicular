from dataclasses import asdict
from datetime import date, datetime
import json
import pytest
from sqlalchemy import func, select
from ledgertrace.db.models import JournalEntry, JournalLine, BankLine, ReplayBalance
from ledgertrace.replay.engine import ReplayError, replay_job, load_rollforward, rollforward_path
from conftest import ingest_fixture


@pytest.fixture(autouse=True)
def replay_files(tmp_path, monkeypatch):
    monkeypatch.setenv("LEDGERTRACE_DATA_DIR", str(tmp_path / "data"))


def balances(session, job):
    return {(r.account_id, r.as_of_date): r.balance_cents for r in session.scalars(
        select(ReplayBalance).where(ReplayBalance.job_id == job.id))}


def add_cash(session, job, name, day, amount, account="1000"):
    entry = JournalEntry(id=f"{job.id}:{name}", job_id=job.id, source_journal_id=name,
        txn_date=date.fromisoformat(day), created_at=datetime.fromisoformat(day),
        modified_at=datetime.fromisoformat(day), file_row_first=100)
    session.add(entry)
    session.flush()
    session.add(JournalLine(id=f"{entry.id}:cash", job_id=job.id, entry_id=entry.id,
        source_line_id=f"{name}:cash", account_id=account, debit_cents=max(amount, 0),
        credit_cents=max(-amount, 0), file_row=100))


def test_happy_identity_ok(session):
    job = ingest_fixture("happy", session)
    roll = replay_job(session, job.id)
    assert (roll.opening_cash_cents, roll.period_cash_movement_cents, roll.ending_cash_cents) == (100000, 25000, 125000)
    assert roll.identity_ok and roll.bank_vs_gl_ok
    assert (roll.bank_opening_cents, roll.bank_movement_cents, roll.bank_ending_cents) == (100000, 25000, 125000)
    assert job.status == "replayed"
    assert load_rollforward(job.id) == roll
    assert json.loads(rollforward_path(job.id).read_text()) == {**asdict(roll), "notes": list(roll.notes)}


def test_happy_snapshots_start_and_end(session):
    job = ingest_fixture("happy", session)
    replay_job(session, job.id)
    expected = {date(2025, 1, 1): 100000, date(2025, 1, 15): 150000,
                date(2025, 1, 16): 130000, date(2025, 1, 17): 125000, date(2025, 12, 31): 125000}
    assert balances(session, job) == {(account, day): value for account in ("1000", "__CASH_TOTAL__") for day, value in expected.items()}


def test_replay_idempotent(session):
    job = ingest_fixture("happy", session)
    first = replay_job(session, job.id)
    before = balances(session, job)
    raw = rollforward_path(job.id).read_bytes()
    assert replay_job(session, job.id) == first
    assert balances(session, job) == before
    assert session.scalar(select(func.count()).select_from(ReplayBalance)) == 10
    assert rollforward_path(job.id).read_bytes() == raw


def test_void_entry_excluded(session):
    job = ingest_fixture("happy", session)
    session.get(JournalEntry, f"{job.id}:j3").is_void = True
    roll = replay_job(session, job.id)
    assert roll.period_cash_movement_cents == 30000 and roll.ending_cash_cents == 130000
    assert roll.identity_ok


def test_d4_ingest_replay_still_identity_ok(session):
    job = ingest_fixture("d4_unmatched", session)
    roll = replay_job(session, job.id)
    assert roll.period_cash_movement_cents == 45000 and roll.ending_cash_cents == 145000
    assert roll.bank_movement_cents == 12655 and roll.bank_ending_cents == 112655
    assert roll.identity_ok and roll.bank_vs_gl_ok is False
    assert load_rollforward(job.id) == roll


def test_lines_after_period_end_ignored(session):
    job = ingest_fixture("happy", session)
    add_cash(session, job, "future", "2026-02-01", 99999)
    assert replay_job(session, job.id).ending_cash_cents == 125000
    assert len(balances(session, job)) == 10


def test_missing_opening_relative_mode(session):
    job = ingest_fixture("happy", session)
    job.expected_opening_cash_cents = None
    roll = replay_job(session, job.id)
    assert roll.opening_cash_cents is None
    assert roll.period_cash_movement_cents == roll.ending_cash_cents == 25000
    assert roll.identity_ok and roll.bank_vs_gl_ok is None
    assert roll.bank_opening_cents is None and roll.bank_ending_cents == 25000
    assert "absolute bank ending unknown without opening" in roll.notes


def test_replay_requires_cash_accounts(session):
    job = ingest_fixture("happy", session)
    job.cash_account_ids_json = "[]"
    with pytest.raises(ReplayError, match="cash_account_ids empty"):
        replay_job(session, job.id)
    assert not balances(session, job) and not rollforward_path(job.id).exists()


@pytest.mark.parametrize("opening,ending,start", [(100000, 125000, 100000), (None, 32000, 7000)])
def test_preperiod_cash_rule_and_bank_boundaries(session, opening, ending, start):
    job = ingest_fixture("happy", session)
    job.expected_opening_cash_cents = opening
    add_cash(session, job, "prior", "2024-12-31", 7000)
    for name, day in [("prior", "2024-12-31"), ("future", "2026-01-01")]:
        session.add(BankLine(id=f"{job.id}:bank-{name}", job_id=job.id, source_id=name,
            posted_date=date.fromisoformat(day), amount_cents=99999, currency="USD", description=name, file_row=100))
    roll = replay_job(session, job.id)
    assert roll.ending_cash_cents == ending and roll.identity_ok
    assert roll.period_cash_movement_cents == roll.bank_movement_cents == 25000
    assert balances(session, job)[("__CASH_TOTAL__", date(2025, 1, 1))] == start
    assert all(day >= date(2025, 1, 1) for _, day in balances(session, job))


def test_multiple_cash_accounts_without_invented_split(session):
    job = ingest_fixture("happy", session)
    job.cash_account_ids_json = '["1000", "1010", "1020"]'
    add_cash(session, job, "other", "2025-02-01", 7000, "1010")
    roll = replay_job(session, job.id)
    rows = balances(session, job)
    for account in ("1000", "1010", "1020"):
        assert rows[(account, date(2025, 1, 1))] == 0
    assert rows[("1020", date(2025, 12, 31))] == 0
    assert rows[("1010", date(2025, 12, 31))] == 7000
    assert roll.ending_cash_cents == 132000 and roll.identity_ok


def test_period_boundary_dates_are_end_of_day(session):
    job = ingest_fixture("happy", session)
    add_cash(session, job, "start", "2025-01-01", 100)
    add_cash(session, job, "end", "2025-12-31", -50)
    roll = replay_job(session, job.id)
    rows = balances(session, job)
    assert rows[("__CASH_TOTAL__", date(2025, 1, 1))] == 100100
    assert rows[("__CASH_TOTAL__", date(2025, 12, 31))] == 125050
    assert roll.identity_ok and len(rows) == 10


def test_closing_mismatch_is_note_not_identity_failure(session):
    job = ingest_fixture("happy", session)
    job.expected_closing_cash_cents = 999
    roll = replay_job(session, job.id)
    assert roll.identity_ok and "closing_mismatch" in roll.notes


def test_failed_commit_preserves_prior_replay(session, monkeypatch):
    job = ingest_fixture("happy", session)
    first = replay_job(session, job.id)
    previous = balances(session, job)
    job.expected_opening_cash_cents = 200000
    def fail():
        raise RuntimeError("commit failed")
    monkeypatch.setattr(session, "commit", fail)
    with pytest.raises(ReplayError, match="commit failed"):
        replay_job(session, job.id)
    assert balances(session, job) == previous
    assert load_rollforward(job.id) == first
    assert not list(rollforward_path(job.id).parent.glob("*.tmp"))
