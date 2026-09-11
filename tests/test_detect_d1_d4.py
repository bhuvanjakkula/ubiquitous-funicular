import csv
import io
import json
from datetime import date
import pytest
from sqlalchemy import select
from ledgertrace.db.models import Job, BankLine, JournalEntry, JournalLine, Finding, Match
from ledgertrace.ingest.job_config import load_job_config
from ledgertrace.ingest.service import ingest_job
from ledgertrace.replay.engine import replay_job
from ledgertrace.detect.base import DetectorError, persist_findings
from ledgertrace.detect.beginning_balance import run_d1
from ledgertrace.detect.unmatched_bank import run_d4
from ledgertrace.detect.run_d1_d4 import run_d1_d4
from conftest import ingest_fixture, fixtures_dir


@pytest.fixture(autouse=True)
def detector_files(tmp_path, monkeypatch):
    monkeypatch.setenv("LEDGERTRACE_DATA_DIR", str(tmp_path / "data"))


def findings(session, job):
    return list(session.scalars(select(Finding).where(Finding.job_id == job.id).order_by(Finding.id)))


def matches(session, job):
    return list(session.scalars(select(Match).where(Match.job_id == job.id).order_by(Match.id)))


def pairs(session, job):
    return {(session.get(BankLine, row.bank_line_id).source_id,
             session.get(JournalLine, row.journal_line_id).source_line_id) for row in matches(session, job)}


def mini_job(session, tmp_path, bank_rows, cash_rows):
    """Rows are (source ID, ISO date, signed integer cents, memo)."""
    def amount(value):
        return f"{'-' if value < 0 else ''}{abs(value) // 100}.{abs(value) % 100:02d}"
    def write(name, header, rows):
        path = tmp_path / name
        with path.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(header)
            writer.writerows(rows)
        return path
    bank = write("bank.csv", ["bank_line_id", "posted_date", "amount", "description"],
                 [(sid, day, amount(cents), memo) for sid, day, cents, memo in bank_rows])
    lines = []
    for sid, day, cents, memo in cash_rows:
        lines.append([sid, "J-" + sid, day, "1000", amount(max(cents, 0)), amount(max(-cents, 0)), memo])
        lines.append([sid + "-other", "J-" + sid, day, "4000", amount(max(-cents, 0)), amount(max(cents, 0)), memo])
    gl = write("gl.csv", ["line_id", "journal_id", "txn_date", "account_id", "debit", "credit", "memo"], lines)
    return ingest_job(session, bank, gl, load_job_config(fixtures_dir / "happy/job.json"))


def test_happy_d1_pass_d4_all_matched(session):
    job = ingest_fixture("happy", session)
    result = run_d1_d4(session, job.id)
    assert result == {"job_id": job.id, "status": "detected", "matches": 3,
                      "finding_counts": {"FAIL": 0, "UNKNOWN": 0, "INFO": 0}}
    assert findings(session, job) == []
    assert pairs(session, job) == {("b1", "l1"), ("b2", "l4"), ("b3", "l6")}
    assert all(row.method == "exact_amount_date" and row.confidence == 100 for row in matches(session, job))
    assert {row.id for row in matches(session, job)} == {f"{job.id}:b1->l1", f"{job.id}:b2->l4", f"{job.id}:b3->l6"}
    assert job.status == "detected"


def test_d1_opening_break_fail(session):
    job = ingest_fixture("d1_opening_break", session)
    run_d1_d4(session, job.id)
    fs = findings(session, job)
    assert len(fs) == 1
    f = fs[0]
    assert (f.id, f.detector_id, f.severity, f.amount_cents) == (
        f"{job.id}:beginning_balance_break:opening", "beginning_balance_break", "FAIL", 60000)
    assert json.loads(f.payload_json) == {"expected_opening_cents": 100000,
        "implied_opening_cents": 40000, "delta_cents": 60000}
    assert json.loads(f.cite_line_ids_json) == [f"{job.id}:l0a"]
    assert json.loads(f.cite_entry_ids_json) == [f"{job.id}:j0"]
    assert pairs(session, job) == {("b1", "l1"), ("b2", "l4"), ("b3", "l6")}
    assert all(row.bank_line_id != f"{job.id}:b0" for row in matches(session, job))


def test_d4_unmatched_two_fails(session):
    job = ingest_fixture("d4_unmatched", session)
    result = run_d1_d4(session, job.id)
    assert result["finding_counts"]["FAIL"] == 3
    assert pairs(session, job) == {("b1", "l1"), ("b2", "l4"), ("b3", "l6")}
    fs = {f.detector_id: f for f in findings(session, job)}
    bank, gl, divergence = fs["unmatched_bank"], fs["unmatched_gl"], fs["beginning_balance_break"]
    assert bank.amount_cents == -12345 and json.loads(bank.payload_json)["source_id"] == "b_fee"
    assert bank.id == f"{job.id}:unmatched_bank:bank:b_fee"
    assert json.loads(bank.cite_bank_ids_json) == [f"{job.id}:b_fee"]
    assert gl.amount_cents == 20000 and json.loads(gl.payload_json)["source_line_id"] == "l7"
    assert gl.id == f"{job.id}:unmatched_gl:gl:l7"
    assert json.loads(gl.cite_line_ids_json) == [f"{job.id}:l7"]
    assert json.loads(gl.cite_entry_ids_json) == [f"{job.id}:j4"]
    assert divergence.id == f"{job.id}:beginning_balance_break:bank_vs_gl"
    assert divergence.amount_cents == 32345
    assert json.loads(divergence.payload_json) == {"gl_ending_cents": 145000, "bank_ending_cents": 112655}


def test_d1_unknown_without_opening(session):
    job = ingest_fixture("happy", session)
    job.expected_opening_cash_cents = None
    replay_job(session, job.id)
    out = run_d1(session, job.id)
    assert len(out) == 1 and out[0].severity == "UNKNOWN"
    assert out[0].detector_id == "beginning_balance_break"
    assert out[0].payload == {"reason": "expected_opening_missing"}
    assert out[0].cite_line_ids or out[0].cite_bank_ids


def test_d4_does_not_match_across_amount(session):
    job = ingest_fixture("d4_unmatched", session)
    out = run_d4(session, job.id)
    assert not any(row.bank_line_id == f"{job.id}:b_fee" or row.journal_line_id == f"{job.id}:l7" for row in matches(session, job))
    assert {(f.detector_id, f.amount_cents) for f in out} == {("unmatched_bank", -12345), ("unmatched_gl", 20000)}


def test_persist_does_not_drop_unbalanced_entry(session):
    job = ingest_fixture("unbalanced_je", session)
    original = findings(session, job)[0]
    original_payload = original.payload_json
    for _ in range(2):
        run_d1_d4(session, job.id)
        retained = session.get(Finding, original.id)
        assert retained is not None and retained.detector_id == "unbalanced_entry"
        assert retained.amount_cents == 6000 and retained.payload_json == original_payload


def test_d4_pass_b_unique_off_date(session, tmp_path):
    job = mini_job(session, tmp_path, [("B", "2025-01-15", 10000, "Receipt")], [("L", "2025-01-17", 10000, "Receipt")])
    run_d1_d4(session, job.id)
    assert pairs(session, job) == {("B", "L")}
    row = matches(session, job)[0]
    assert row.method == "amount_date_desc" and row.confidence in (80, 90)
    out = findings(session, job)
    assert len(out) == 1 and out[0].severity == "INFO"
    assert json.loads(out[0].payload_json)["pass"] == "B"


def test_rerun_replaces_matches_not_duplicates(session):
    job = ingest_fixture("happy", session)
    first = run_d1_d4(session, job.id)
    ids = [row.id for row in matches(session, job)]
    assert run_d1_d4(session, job.id) == first
    assert len(matches(session, job)) == 3 and [row.id for row in matches(session, job)] == ids


def test_rerun_clears_resolved_findings_even_with_empty_incoming_set(session):
    job = ingest_fixture("d1_opening_break", session)
    run_d1_d4(session, job.id)
    assert len(findings(session, job)) == 1
    job.expected_opening_cash_cents = 40000
    run_d1_d4(session, job.id)
    assert findings(session, job) == [] and len(matches(session, job)) == 3


def test_d1_closing_mismatch_has_distinct_stable_id(session):
    job = ingest_fixture("d1_opening_break", session)
    job.expected_closing_cash_cents = 130000
    run_d1_d4(session, job.id)
    fs = {f.id.rsplit(":", 1)[1]: f for f in findings(session, job)}
    assert set(fs) == {"opening", "closing"}
    assert fs["closing"].amount_cents == 5000
    assert json.loads(fs["closing"].payload_json) == {"expected_closing_cents": 130000, "replay_ending_cents": 125000}


def test_d1_requires_replay(session):
    job = ingest_fixture("happy", session)
    with pytest.raises(DetectorError, match="replay required"):
        run_d1(session, job.id)


def test_d4_pass_c_unique_normalized_description(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("B", "2025-01-15", 10000, " Deposit   #123456 ")],
        [("L1", "2025-01-16", 10000, "deposit #654321"), ("L2", "2025-01-17", 10000, "Other")])
    out = run_d4(session, job.id)
    assert pairs(session, job) == {("B", "L1")}
    assert any(f.severity == "INFO" and f.payload["pass"] == "C" for f in out)
    assert [(f.detector_id, f.payload["source_line_id"]) for f in out if f.severity == "FAIL"] == [("unmatched_gl", "L2")]


def test_d4_ambiguous_off_date_candidates_remain_unmatched(session, tmp_path):
    job = mini_job(session, tmp_path, [("B", "2025-01-15", 10000, "Same")],
                   [("L1", "2025-01-16", 10000, "Same"), ("L2", "2025-01-17", 10000, "Same")])
    out = run_d4(session, job.id)
    assert matches(session, job) == [] and len(out) == 3
    assert all(f.severity == "FAIL" for f in out)


@pytest.mark.parametrize("day,matched", [("2025-01-18", True), ("2025-01-19", False)])
def test_d4_three_day_limit(session, tmp_path, day, matched):
    job = mini_job(session, tmp_path, [("B", "2025-01-15", 10000, "Receipt")], [("L", day, 10000, "Receipt")])
    run_d4(session, job.id)
    assert bool(matches(session, job)) is matched


def test_d4_exact_matches_have_priority_over_off_date(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("B-early", "2025-01-15", 10000, "Receipt"), ("B-exact", "2025-01-17", 10000, "Receipt")],
        [("L", "2025-01-17", 10000, "Receipt")])
    run_d4(session, job.id)
    assert pairs(session, job) == {("B-exact", "L")}


def test_d4_exact_duplicates_are_stable_one_to_one(session, tmp_path):
    job = mini_job(session, tmp_path,
        [("B2", "2025-01-15", 10000, "Receipt"), ("B1", "2025-01-15", 10000, "Receipt")],
        [("L2", "2025-01-15", 10000, "Receipt"), ("L1", "2025-01-15", 10000, "Receipt")])
    for _ in range(2):
        run_d4(session, job.id)
        assert pairs(session, job) == {("B1", "L1"), ("B2", "L2")}


def test_d4_void_and_future_rows_are_not_candidates(session):
    job = ingest_fixture("happy", session)
    session.get(JournalEntry, f"{job.id}:j1").is_void = True
    session.get(JournalEntry, f"{job.id}:j2").txn_date = date(2026, 1, 1)
    session.get(BankLine, f"{job.id}:b2").posted_date = date(2026, 1, 1)
    session.commit()
    out = run_d4(session, job.id)
    assert pairs(session, job) == {("b3", "l6")}
    assert len(out) == 1 and out[0].payload["source_id"] == "b1"


def test_persist_only_replaces_this_job(session):
    first = ingest_fixture("d4_unmatched", session)
    run_d1_d4(session, first.id)
    first_ids = [f.id for f in findings(session, first)]
    second = ingest_fixture("happy", session)
    run_d1_d4(session, second.id)
    assert [f.id for f in findings(session, first)] == first_ids
    assert len(matches(session, first)) == 3 and len(matches(session, second)) == 3


def test_all_failure_citations_resolve_within_job(session):
    job = ingest_fixture("d4_unmatched", session)
    run_d1_d4(session, job.id)
    for f in findings(session, job):
        referenced = 0
        for column, model in ((f.cite_bank_ids_json, BankLine), (f.cite_line_ids_json, JournalLine), (f.cite_entry_ids_json, JournalEntry)):
            for identifier in json.loads(column):
                row = session.get(model, identifier)
                assert row is not None and row.job_id == job.id
                referenced += 1
        assert referenced > 0


def test_zero_sum_preperiod_basis_can_fail_opening(session):
    job = ingest_fixture("d1_opening_break", session)
    line = session.get(JournalLine, f"{job.id}:l0b")
    line.account_id = "1000"  # Equal opposing pre-period cash lines; evidence still exists.
    run_d1_d4(session, job.id)
    out = findings(session, job)
    assert len(out) == 1 and out[0].amount_cents == 100000
    assert json.loads(out[0].payload_json)["implied_opening_cents"] == 0


def test_persist_rejects_attempt_to_replace_ingest_findings(session):
    job = ingest_fixture("unbalanced_je", session)
    with pytest.raises(DetectorError):
        persist_findings(session, job.id, [], detector_ids={"unbalanced_entry"})
    assert len(findings(session, job)) == 1
