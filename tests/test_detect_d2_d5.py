"""Day 8 timestamp rules and export availability regressions."""
import csv
import json
from collections import Counter
from datetime import datetime, date
import pytest
from sqlalchemy import select
from ledgertrace.db.models import Finding, JournalEntry, JournalLine
from ledgertrace.detect.edited_after_clear import run_d2
from ledgertrace.detect.period_mutation import run_d5
from ledgertrace.detect.run_d2_d5 import run_d2_d5
from ledgertrace.detect.run_d1_d4 import run_d1_d4
from ledgertrace.detect.run_integrity_partial import run_d1_d2_d4_d5
from ledgertrace.ingest.metadata import metadata_path, load_metadata
from ledgertrace.ingest.service import ingest_job
from ledgertrace.ingest.job_config import load_job_config
from conftest import ingest_fixture, fixtures_dir


def changed_export(session, tmp_path, *, remove=(), changes=None):
    rows = list(csv.DictReader((fixtures_dir / "happy/gl.csv").open()))
    for row in rows:
        for key in remove:
            row.pop(key)
        if changes:
            changes(row)
    path = tmp_path / "gl.csv"
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return ingest_job(session, fixtures_dir / "happy/bank.csv", path,
                      load_job_config(fixtures_dir / "happy/job.json"))


@pytest.mark.parametrize("name,detector", [("d2_edited_after_clear", run_d2), ("d5_after_close", run_d5)])
def test_fixture_expected(session, name, detector):
    job = ingest_fixture(name, session)
    expected = json.loads((fixtures_dir / name / "expected_findings.json").read_text())
    results = detector(session, job.id)
    assert {(r.detector_id, r.payload.get("source_line_id") if name.startswith("d2") else r.payload.get("source_journal_id")) for r in results} == {(r["detector_id"], r["source_id"]) for r in expected["fail"]}
    if name.startswith("d2"):
        assert len(results) == 1 and results[0].amount_cents == -20000
    else:
        assert len(results) == 3
        assert {(r.payload["source_journal_id"], r.title) for r in results} == {
            ("j5", "Period books mutated after close date"),
            ("j6", "Period books mutated after close date"),
            ("j6", "Backdated entry created after close")}
    assert all(r.severity == "FAIL" and r.cite_line_ids and r.cite_entry_ids for r in results)
    assert list(session.scalars(select(Finding))) == []  # proposals are read-only


def test_happy_clean(session):
    job = ingest_fixture("happy", session)
    assert run_d2(session, job.id) == run_d5(session, job.id) == []


@pytest.mark.parametrize("remove", [("modified_at",), ("created_at", "modified_at")])
def test_missing_columns_unknown(session, tmp_path, remove):
    job = changed_export(session, tmp_path, remove=remove)
    for detector in (run_d2, run_d5):
        results = detector(session, job.id)
        if detector == run_d5 and len(remove) == 1:
            assert results == []
        else:
            assert len(results) == 1
            assert results[0].severity == "UNKNOWN"
            assert results[0].cite_line_ids
    assert "modified_at" not in load_metadata(job)["columns"]


def test_d5_creation_still_checked_without_modification(session, tmp_path):
    job = changed_export(session, tmp_path, remove=("modified_at",),
                         changes=lambda r: r.update(created_at="2026-02-01"))
    results = run_d5(session, job.id)
    assert Counter(r.severity for r in results) == {"FAIL": 3}
    assert all(r.title == "Backdated entry created after close" for r in results if r.severity == "FAIL")


@pytest.mark.parametrize("field", ["created_at", "modified_at"])
def test_blank_timestamp_is_not_evidence(session, tmp_path, field):
    def change(row):
        if row["line_id"] == "l1": row[field] = ""
    job = changed_export(session, tmp_path, changes=change)
    assert [r.severity for r in run_d2(session, job.id)] == ["UNKNOWN"]
    assert [r.severity for r in run_d5(session, job.id)] == ["UNKNOWN"]


def test_clear_flag_without_date(session):
    job = ingest_fixture("happy", session)
    line = session.scalar(select(JournalLine).where(JournalLine.source_line_id == "l1"))
    line.cleared_date = None
    session.flush()
    results = run_d2(session, job.id)
    assert len(results) == 1 and results[0].severity == "UNKNOWN"


@pytest.mark.parametrize("created,modified,expected", [
    ("2025-01-16", "2025-01-31", 0),
    ("2025-06-02", "2025-06-02", 0),
    ("2025-01-15", "2025-04-01", 1)])
def test_d2_strict_date_rules(session, created, modified, expected):
    job = ingest_fixture("d2_edited_after_clear", session)
    entry = session.scalar(select(JournalEntry).where(JournalEntry.source_journal_id == "j2"))
    entry.created_at = datetime.fromisoformat(created)
    entry.modified_at = datetime.fromisoformat(modified)
    session.flush()
    assert len(run_d2(session, job.id)) == expected


def test_d2_clear_date_without_flag_and_payload(session):
    job = ingest_fixture("d2_edited_after_clear", session)
    line = session.scalar(select(JournalLine).where(JournalLine.source_line_id == "l4"))
    line.cleared_flag = False
    session.flush()
    result, = run_d2(session, job.id)
    assert result.payload == dict(cleared_date="2025-01-31", modified_at="2025-06-02T00:00:00",
                                 created_at="2025-01-16T00:00:00", debit_cents=0, credit_cents=20000, account_id="1000",
                                 source_line_id="l4", source_journal_id="j2")


def test_no_close_unknown(session):
    job = ingest_fixture("happy", session)
    job.period_close_date = None
    result, = run_d5(session, job.id)
    assert result.severity == "UNKNOWN"


@pytest.mark.parametrize("txn,modified,expected", [
    ("2025-12-31", "2026-01-15T23:59:59", 0),
    ("2025-12-31", "2026-01-16T00:00:00", 1),
    ("2026-01-01", "2026-02-01T00:00:00", 0),
    ("2024-12-31", "2026-02-01T00:00:00", 1)])
def test_d5_date_boundaries(session, txn, modified, expected):
    job = ingest_fixture("happy", session)
    entry = session.scalar(select(JournalEntry).where(JournalEntry.source_journal_id == "j1"))
    entry.txn_date = date.fromisoformat(txn)
    entry.modified_at = datetime.fromisoformat(modified)
    session.flush()
    assert len(run_d5(session, job.id)) == expected


@pytest.mark.parametrize("damage", ["missing", "corrupt", "hash"])
def test_unavailable_metadata_unknown(session, damage):
    job = ingest_fixture("happy", session)
    path = metadata_path(job.id)
    if damage == "missing": path.unlink()
    elif damage == "corrupt": path.write_text("{")
    else:
        data = json.loads(path.read_text()); data["input_gl_sha256"] = "wrong"
        path.write_text(json.dumps(data))
    for detector in (run_d2, run_d5):
        result, = detector(session, job.id)
        assert result.severity == "UNKNOWN"


def test_alias_metadata(session):
    job = ingest_fixture("alias_headers", session)
    assert run_d2(session, job.id)[0].severity == "UNKNOWN"
    assert run_d5(session, job.id)[0].severity == "UNKNOWN"


def test_runners_preserve_scopes_and_repeat(session):
    job = ingest_fixture("d2_edited_after_clear", session)
    run_d1_d4(session, job.id)
    original = {f.id for f in session.scalars(select(Finding))}
    first = run_d2_d5(session, job.id)
    ids = {f.id for f in session.scalars(select(Finding))}
    assert first["finding_counts"] == {"FAIL": 1, "UNKNOWN": 0, "INFO": 0}
    assert original < ids
    assert run_d2_d5(session, job.id) == first
    assert {f.id for f in session.scalars(select(Finding))} == ids
    run_d1_d4(session, job.id)
    assert {f.id for f in session.scalars(select(Finding))} == ids
    entry = session.scalar(select(JournalEntry).where(JournalEntry.source_journal_id == "j2"))
    entry.modified_at = entry.created_at
    run_d2_d5(session, job.id)
    assert {f.id for f in session.scalars(select(Finding))} == original


def test_ingest_failure_removes_metadata(session, tmp_path, monkeypatch):
    from ledgertrace.ingest.errors import IngestError
    def fail(): raise RuntimeError("commit failed")
    monkeypatch.setattr(session, "commit", fail)
    with pytest.raises(IngestError, match="commit failed"):
        ingest_fixture("happy", session)
    assert list((tmp_path / "data").rglob("gl_columns.json")) == []


def test_missing_clearing_columns_unknown(session, tmp_path):
    job = changed_export(session, tmp_path, remove=("cleared_flag", "cleared_date"))
    result, = run_d2(session, job.id)
    assert result.severity == "UNKNOWN"


def test_timestamp_aliases_are_observed(session, tmp_path):
    def rename(row):
        row["last modified"] = row.pop("modified_at")
        row["entered at"] = row.pop("created_at")
    job = changed_export(session, tmp_path, changes=rename)
    assert {"created_at", "modified_at"} <= set(load_metadata(job)["columns"])
    assert run_d2(session, job.id) == run_d5(session, job.id) == []


def test_missing_creation_column_unknown(session, tmp_path):
    job = changed_export(session, tmp_path, remove=("created_at",))
    assert len(run_d2(session, job.id)) == 3
    assert all(r.severity == "UNKNOWN" for r in run_d2(session, job.id))
    assert run_d5(session, job.id) == []


def test_runner_failure_rolls_back_prior_results(session, monkeypatch):
    import importlib
    runner = importlib.import_module("ledgertrace.detect.run_d2_d5")
    job = ingest_fixture("d2_edited_after_clear", session)
    run_d2_d5(session, job.id)
    prior = {f.id for f in session.scalars(select(Finding))}
    def fail(): raise RuntimeError("commit failed")
    monkeypatch.setattr(session, "commit", fail)
    with pytest.raises(RuntimeError, match="commit failed"):
        run_d2_d5(session, job.id)
    assert {f.id for f in session.scalars(select(Finding))} == prior


def test_combined_happy_and_no_timestamps(session):
    job = ingest_fixture("happy", session)
    result = run_d1_d2_d4_d5(session, job.id)
    assert result["matches"] == 3
    assert result["finding_counts"] == {"FAIL": 0, "UNKNOWN": 0, "INFO": 0}
    job = ingest_fixture("no_timestamps", session)
    result = run_d1_d2_d4_d5(session, job.id)
    assert result["finding_counts"] == {"FAIL": 0, "UNKNOWN": 2, "INFO": 0}
    for detector, missing in ((run_d2, "modified_at"), (run_d5, ["created_at", "modified_at"])):
        finding, = detector(session, job.id)
        assert finding.severity == "UNKNOWN" and finding.payload == {"missing": missing}
    cols = load_metadata(job)
    assert all(v is False for v in cols["resolved"].values())


@pytest.mark.parametrize("name,detector,jid", [("d2_edited_after_clear", run_d2, "j2"), ("d5_after_close", run_d5, "j6")])
def test_void_entries_excluded(session, name, detector, jid):
    job = ingest_fixture(name, session)
    entry = session.scalar(select(JournalEntry).where(JournalEntry.source_journal_id == jid))
    entry.is_void = True
    session.flush()
    results = detector(session, job.id)
    assert all(entry.id not in r.cite_entry_ids for r in results)
    assert len(results) == (0 if detector == run_d2 else 1)


def test_combined_repeat_and_preserve_ingest(session):
    job = ingest_fixture("unbalanced_je", session)
    original = {f.id for f in session.scalars(select(Finding))}
    first = run_d1_d2_d4_d5(session, job.id)
    ids = {f.id for f in session.scalars(select(Finding))}
    assert original <= ids
    assert run_d1_d2_d4_d5(session, job.id) == first
    assert {f.id for f in session.scalars(select(Finding))} == ids


def test_d2_missing_date_column(session, tmp_path):
    job = changed_export(session, tmp_path, remove=("cleared_date",))
    findings = run_d2(session, job.id)
    assert len(findings) == 3
    assert all(f.severity == "UNKNOWN" and f.title == "Cleared line missing cleared_date" for f in findings)
