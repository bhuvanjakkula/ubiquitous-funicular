from dataclasses import asdict
from datetime import date, datetime
import json
import pytest
from sqlalchemy import func, select
from ledgertrace.db.models import JournalEntry, JournalLine, BankLine, ReplayBalance, Finding
from ledgertrace.replay.engine import ReplayError, replay_job, load_rollforward, rollforward_path
from conftest import ingest_fixture, fixtures_dir
from ledgertrace.replay.engine import implied_opening_cash_cents, opening_basis


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



def test_d1_fixture_ingest_counts(session):
    job = ingest_fixture("d1_opening_break", session)
    assert job.status == "ingested"
    assert [session.scalar(select(func.count()).select_from(model))
            for model in (BankLine, JournalEntry, JournalLine, Finding)] == [4, 4, 8, 0]
    assert {r.source_id for r in session.scalars(select(BankLine))} == {"b0", "b1", "b2", "b3"}
    assert {r.source_journal_id for r in session.scalars(select(JournalEntry))} == {"j0", "j1", "j2", "j3"}
    replay_job(session, job.id)
    assert job.status == "replayed"


def test_d1_replay_uses_claimed_opening(session):
    job = ingest_fixture("d1_opening_break", session)
    roll = replay_job(session, job.id)
    assert roll.opening_cash_cents == 100000
    assert roll.period_cash_movement_cents == 25000
    assert roll.ending_cash_cents == 125000 and roll.identity_ok
    assert balances(session, job)[("__CASH_TOTAL__", date(2025, 1, 1))] == 100000


def test_d1_implied_opening_from_books(session):
    job = ingest_fixture("d1_opening_break", session)
    implied = implied_opening_cash_cents(session, job.id)
    assert implied == 40000
    assert job.expected_opening_cash_cents - implied == 60000
    expected = json.loads((fixtures_dir / "d1_opening_break/expected_findings.json").read_text())
    assert expected == {"fail": [{"detector_id": "beginning_balance_break", "amount_cents": 60000,
        "payload": {"expected_opening_cents": 100000, "implied_opening_cents": 40000, "delta_cents": 60000}}],
        "unknown": [], "info": []}


def test_d1_bank_includes_only_period_lines_when_opening_claimed(session):
    job = ingest_fixture("d1_opening_break", session)
    roll = replay_job(session, job.id)
    assert roll.bank_movement_cents == 25000
    assert roll.bank_ending_cents == 125000 and roll.bank_vs_gl_ok is True


def test_happy_implied_opening_zero(session):
    job = ingest_fixture("happy", session)
    # Raw implied opening ONLY sums pre-period cash from zero. It never trusts
    # the claim. D1 must use opening_basis to avoid a false FAIL for absent history.
    assert implied_opening_cash_cents(session, job.id) == 0
    assert job.expected_opening_cash_cents == 100000


def test_opening_basis_happy_is_claimed(session):
    job = ingest_fixture("happy", session)
    assert opening_basis(session, job.id) == ("claimed", 100000)


def test_opening_basis_d1_is_books_preperiod(session):
    job = ingest_fixture("d1_opening_break", session)
    assert opening_basis(session, job.id) == ("books_preperiod", 40000)


def test_d4_replay_regression(session):
    job = ingest_fixture("d4_unmatched", session)
    roll = replay_job(session, job.id)
    assert (roll.ending_cash_cents, roll.bank_ending_cents) == (145000, 112655)
    assert roll.identity_ok is True and roll.bank_vs_gl_ok is False


def test_opening_helpers_read_only_and_missing_claim(session):
    job = ingest_fixture("happy", session)
    job.expected_opening_cash_cents = None
    session.commit()
    assert implied_opening_cash_cents(session, job.id) == 0
    assert opening_basis(session, job.id) == ("claimed", None)
    assert job.status == "ingested" and not balances(session, job)
    assert not rollforward_path(job.id).exists()
    roll = replay_job(session, job.id)
    before = balances(session, job)
    content = rollforward_path(job.id).read_bytes()
    assert opening_basis(session, job.id) == ("claimed", None)
    assert implied_opening_cash_cents(session, job.id) == 0
    assert balances(session, job) == before
    assert rollforward_path(job.id).read_bytes() == content
    assert load_rollforward(job.id) == roll


def test_zero_sum_preperiod_still_has_books_basis(session):
    job = ingest_fixture("d1_opening_break", session)
    add_cash(session, job, "offset", "2024-12-21", -40000)
    session.commit()
    assert implied_opening_cash_cents(session, job.id) == 0
    assert opening_basis(session, job.id) == ("books_preperiod", 0)


def test_opening_helpers_exclude_void_non_cash_and_other_jobs(session):
    job = ingest_fixture("d1_opening_break", session)
    session.get(JournalEntry, f"{job.id}:j0").is_void = True
    add_cash(session, job, "noncash", "2024-12-20", 1234, "6000")
    add_cash(session, job, "on-start", "2025-01-01", 9999)
    session.commit()
    other = ingest_fixture("d1_opening_break", session)
    assert implied_opening_cash_cents(session, job.id) == 0
    assert opening_basis(session, job.id) == ("claimed", 100000)
    assert opening_basis(session, other.id) == ("books_preperiod", 40000)
