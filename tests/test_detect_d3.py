"""Day 9 exact signatures, meaningful reversal exclusions, and runner regressions."""
import json
from datetime import date
from hashlib import sha256
import pytest
from sqlalchemy import select
from ledgertrace.db.models import BankLine, JournalEntry, JournalLine, Finding, Match
from ledgertrace.detect.duplicate_event import run_d3, norm_desc, is_reversal_memo
from ledgertrace.detect.run_integrity import run_integrity
from ledgertrace.detect.run_d1_d4 import run_d1_d4
from ledgertrace.detect.run_d2_d5 import run_d2_d5
from ledgertrace.detect.run_integrity_partial import run_d1_d2_d4_d5
from conftest import ingest_fixture, fixtures_dir
from test_detect_d1_d4 import mini_job


def test_happy_no_duplicate_fail(session):
    job = ingest_fixture("happy", session)
    result = run_integrity(session, job.id)
    assert result["matches"] == 3
    assert result["finding_counts"] == {"FAIL": 0, "UNKNOWN": 0, "INFO": 0}
    assert run_d3(session, job.id) == []


def test_d3_bank_and_gl_full_signature_fail(session):
    job = ingest_fixture("d3_duplicate", session)
    results = run_d3(session, job.id)
    expected = json.loads((fixtures_dir / "d3_duplicate/expected_findings.json").read_text())
    assert {(r.severity.lower(), r.detector_id, r.payload["kind"], r.amount_cents) for r in results} == {
        (severity, f["detector_id"], f["kind"], f["amount_cents"])
        for severity, findings in expected.items() for f in findings}
    assert len(results) == 3
    bank, = [r for r in results if r.payload["kind"] == "bank"]
    gl, = [r for r in results if r.payload["kind"] == "gl"]
    assert bank.cite_bank_ids == [job.id + ":b_dup1", job.id + ":b_dup2"]
    assert gl.cite_line_ids == [job.id + ":l_d1a", job.id + ":l_d2a"]
    assert gl.cite_entry_ids == [job.id + ":j_d1", job.id + ":j_d2"]
    assert gl.payload["signature"] == dict(date="2025-04-01", amount_cents=25000,
                                           account_id="1000", description="wire from acme")
    assert list(session.scalars(select(Finding))) == []  # no persistence in detector
    assert list(session.scalars(select(Match))) == []


def test_d3_reversal_excluded(session):
    job = ingest_fixture("d3_duplicate", session)
    results = run_d3(session, job.id)
    excluded = {job.id + ":" + s for s in ("b_rev1", "b_rev2", "l_r1a", "l_r2b", "j_r1", "j_r2")}
    assert all(not excluded.intersection(r.cite_bank_ids + r.cite_line_ids + r.cite_entry_ids) for r in results)


def test_d3_same_amount_different_desc_info(session):
    job = ingest_fixture("d3_duplicate", session)
    result, = [r for r in run_d3(session, job.id) if r.severity == "INFO"]
    assert result.amount_cents == 4000
    assert result.cite_bank_ids == [job.id + ":b_sameamt1", job.id + ":b_sameamt2"]


def test_d3_same_entry_splits_not_duplicate(session, tmp_path):
    job = mini_job(session, tmp_path, [], [("A", "2025-01-15", 8000, "Receipt")])
    entry = session.scalar(select(JournalEntry))
    session.add(JournalLine(id=job.id + ":split", job_id=job.id, entry_id=entry.id,
                           source_line_id="split", account_id="1000", debit_cents=8000,
                           credit_cents=0, file_row=3))
    session.flush()
    assert run_d3(session, job.id) == []


def test_digit_runs_stripped():
    assert norm_desc("Wire from ACME 998877") == norm_desc("Wire from ACME 112233") == "wire from acme"
    assert norm_desc("  WIRE, from ACME! 1234  ") == "wire from acme 1234"
    assert norm_desc(None) == ""
    assert all(is_reversal_memo(word) for word in ("VOID refund", "reverse", "Reversal", "cancelled"))
    assert not is_reversal_memo("refund")


@pytest.mark.parametrize("days,expected", [(3, 0), (4, 1)])
def test_reversal_window_bank_consumes_only_one(session, tmp_path, days, expected):
    # Without dropping a positive, the two positives form a duplicate cluster.
    job = mini_job(session, tmp_path,
        [("A", "2025-01-15", 8000, "Receipt"), ("B", "2025-01-15", 8000, "Receipt"),
         ("R", f"2025-01-{15 + days}", -8000, "VOID receipt")], [])
    assert len(run_d3(session, job.id)) == expected


def test_reverses_id_without_void_word(session, tmp_path):
    job = mini_job(session, tmp_path, [],
        [("A", "2025-01-15", 8000, "Receipt"), ("B", "2025-01-15", 8000, "Receipt"),
         ("R", "2025-01-18", -8000, "Receipt")])
    assert len(run_d3(session, job.id)) == 1
    entry = session.get(JournalEntry, job.id + ":J-R")
    entry.reverses_id = job.id + ":J-A"
    session.flush()
    assert run_d3(session, job.id) == []


def test_identical_sign_not_reversal(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("A", "2025-01-15", 8000, "VOID refund"), ("B", "2025-01-15", 8000, "VOID refund")], [])
    result, = run_d3(session, job.id)
    assert result.severity == "FAIL" and result.amount_cents == 8000


def test_opposite_sign_without_marker_not_reversal(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("A", "2025-01-15", 8000, "Receipt"), ("B", "2025-01-15", 8000, "Receipt"),
         ("R", "2025-01-16", -8000, "Receipt")], [])
    assert len(run_d3(session, job.id)) == 1


def test_reversal_one_to_one_keeps_residual_duplicate(session, tmp_path):
    job = mini_job(session, tmp_path,
        [(s, "2025-01-15", 8000, "Receipt") for s in ("A", "B", "C")]
        + [("R", "2025-01-16", -8000, "REVERSE receipt")], [])
    result, = run_d3(session, job.id)
    assert result.cite_bank_ids == [job.id + ":B", job.id + ":C"]


def test_explicit_reversal_link_has_priority(session, tmp_path):
    job = mini_job(session, tmp_path, [],
        [(s, "2025-01-15", 8000, "Receipt") for s in ("A", "B", "C")]
        + [("R", "2025-01-16", -8000, "REVERSE receipt")])
    session.get(JournalEntry, job.id + ":J-R").reverses_id = job.id + ":J-C"
    session.flush()
    result, = run_d3(session, job.id)
    assert result.cite_line_ids == [job.id + ":A", job.id + ":B"]


@pytest.mark.parametrize("name", ["d1_opening_break", "d2_edited_after_clear", "d4_unmatched", "d5_after_close"])
def test_prior_fixtures_no_new_d3_fail(session, name):
    job = ingest_fixture(name, session)
    assert run_d3(session, job.id) == []


def test_period_void_accounts_and_stream_isolation(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("A", "2024-12-31", 8000, "Receipt"), ("B", "2024-12-31", 8000, "Receipt"),
         ("C", "2026-01-01", 8000, "Receipt"), ("D", "2026-01-01", 8000, "Receipt"),
         ("E", "2025-01-15", 8000, "Receipt")],
        [("F", "2025-01-15", 8000, "Receipt"), ("G", "2025-01-15", 8000, "Receipt")])
    session.get(JournalEntry, job.id + ":J-G").is_void = True
    session.flush()
    assert run_d3(session, job.id) == []  # bank E and cash F do not cross-cluster
    session.get(JournalEntry, job.id + ":J-G").is_void = False
    session.get(JournalLine, job.id + ":G").account_id = "2000"
    job.cash_account_ids_json = '["1000", "2000"]'
    session.flush()
    assert run_d3(session, job.id) == []  # different cash accounts are distinct signatures


def test_empty_cash_accounts_unknown(session):
    job = ingest_fixture("happy", session)
    job.cash_account_ids_json = "[]"
    result, = run_d3(session, job.id)
    assert result.severity == "UNKNOWN" and result.title == "no cash accounts configured"
    assert result.cite_line_ids


def test_runner_aliases_and_persistence(session):
    assert run_d1_d4 is run_d2_d5 is run_d1_d2_d4_d5 is run_integrity
    job = ingest_fixture("d3_duplicate", session)
    first = run_integrity(session, job.id)
    original = {f.id for f in session.scalars(select(Finding))}
    assert run_integrity(session, job.id) == first
    assert {f.id for f in session.scalars(select(Finding))} == original
    digest = sha256(b"wire from acme").hexdigest()[:8]
    assert job.id + f":duplicate_event:bank:2025-04-01:25000:{digest}" in original
    assert job.id + f":duplicate_event:gl:2025-04-01:25000:1000:{digest}" in original
    # Resolve duplicates and verify old findings disappear on the next run.
    session.get(BankLine, job.id + ":b_dup2").amount_cents = 25001
    session.get(JournalEntry, job.id + ":j_d2").memo = "Another receipt"
    run_integrity(session, job.id)
    assert list(session.scalars(select(Finding).where(Finding.job_id == job.id,
        Finding.detector_id == "duplicate_event", Finding.severity == "FAIL"))) == []


def test_no_info_for_failed_full_signature_members(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("A", "2025-01-15", 8000, "Receipt"), ("B", "2025-01-15", 8000, "Receipt"),
         ("C", "2025-01-15", 8000, "Other")], [])
    result, = run_d3(session, job.id)
    assert result.severity == "FAIL"


@pytest.mark.parametrize("amount", [0, -8000])
def test_zero_and_negative_full_signatures(session, tmp_path, amount):
    job = mini_job(session, tmp_path,
        [("A", "2025-01-01", amount, "VOID refund"), ("B", "2025-01-01", amount, "VOID refund")], [])
    result, = run_d3(session, job.id)
    assert result.severity == "FAIL" and result.amount_cents == abs(amount)


def test_reversal_cannot_cross_streams(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("A", "2025-12-31", 8000, "Receipt"), ("B", "2025-12-31", 8000, "Receipt")],
        [("R", "2025-12-31", -8000, "VOID receipt")])
    result, = run_d3(session, job.id)
    assert result.payload["kind"] == "bank"


def test_second_job_not_in_duplicate_cluster(session, tmp_path):
    first = mini_job(session, tmp_path, [("A", "2025-01-15", 8000, "Receipt")], [])
    second = mini_job(session, tmp_path, [("B", "2025-01-15", 8000, "Receipt")], [])
    assert run_d3(session, first.id) == run_d3(session, second.id) == []
