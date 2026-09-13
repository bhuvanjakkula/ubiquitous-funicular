"""Day 10 workpaper content, repeatability, transaction failures and local API."""
import importlib
import json
from hashlib import sha256
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from ledgertrace.db.models import Job, Finding, EvidencePack, JournalEntry, JournalLine, Match
from ledgertrace.detect.run_all import run_all, RunError
from ledgertrace.detect.run_integrity import run_integrity
from ledgertrace.evidence.pack import DISCLAIMER, evidence_path
from ledgertrace.api.main import app, db_session
from conftest import ingest_fixture, fixtures_dir


def evidence(session, name):
    job = ingest_fixture(name, session)
    result = run_all(session, job.id)
    path = Path(result["evidence_json"])
    assert path == evidence_path(job.id)
    return job, result, json.loads(path.read_text(encoding="utf-8"))


def test_happy_evidence_no_fail_actions(session):
    job, result, body = evidence(session, "happy")
    assert run_integrity is run_all
    assert body["product"] == "LedgerTrace"
    assert body["version"] == body["job"]["software_version"] == job.software_version
    assert body["disclaimer"] == DISCLAIMER
    assert "Does not post" in body["disclaimer"] and "Does not certify GAAP" in body["disclaimer"]
    assert body["job"]["input_bank_sha256"] == job.input_bank_sha256
    assert body["job"]["status"] == "detected"
    assert body["job"]["period_start"] == "2025-01-01"
    assert body["job"]["cash_account_ids"] == ["1000"]
    assert body["job"]["expected_closing_cash_cents"] is None
    rf = body["rollforward"]
    assert rf["ending_cash_cents"] == 125000
    assert rf["identity_ok"] is True and rf["bank_vs_gl_ok"] is True
    assert rf["opening_basis"] == "claimed" and rf["implied_opening_cents"] == 0
    assert body["matches_summary"] == dict(matched=3, unmatched_bank=0, unmatched_gl=0,
                                           methods={"exact_amount_date": 3})
    assert body["findings"] == body["proposed_review_actions"] == []
    assert result["finding_counts"] == {"FAIL": 0, "UNKNOWN": 0, "INFO": 0}
    pack, = session.scalars(select(EvidencePack)).all()
    assert pack.id == job.id + ":evidence" and Path(pack.json_path).is_file()
    assert Path(pack.pdf_path).read_bytes().startswith(b"%PDF") and pack.created_at is not None


def test_d4_evidence_lists_unmatched_and_bank_vs_gl(session):
    job, result, body = evidence(session, "d4_unmatched")
    fails = {f["detector_id"]: f for f in body["findings"] if f["severity"] == "FAIL"}
    assert len(fails) == 3
    assert fails["unmatched_bank"]["amount_cents"] == -12345
    assert fails["unmatched_gl"]["amount_cents"] == 20000
    assert fails["beginning_balance_break"]["payload"] == dict(gl_ending_cents=145000, bank_ending_cents=112655)
    assert fails["unmatched_bank"]["cite_bank_ids"] == [job.id + ":b_fee"]
    assert fails["unmatched_gl"]["cite_line_ids"] == [job.id + ":l7"]
    assert len(body["proposed_review_actions"]) == 3
    assert {a["finding_id"] for a in body["proposed_review_actions"]} == {f["id"] for f in fails.values()}
    assert all(a["kind"] == "inspect" and "will not post" in a["note"] for a in body["proposed_review_actions"])
    assert body["rollforward"]["identity_ok"] is True and body["rollforward"]["bank_vs_gl_ok"] is False
    assert body["rollforward"]["ending_cash_cents"] == 145000
    assert body["rollforward"]["bank_ending_cents"] == 112655
    assert body["matches_summary"]["unmatched_bank"] == body["matches_summary"]["unmatched_gl"] == 1
    assert result["finding_counts_by_detector"] == {d: {"FAIL": 1, "UNKNOWN": 0, "INFO": 0} for d in fails}


def test_d1_evidence_opening_payload(session):
    _, _, body = evidence(session, "d1_opening_break")
    finding, = body["findings"]
    assert finding["payload"] == dict(expected_opening_cents=100000, implied_opening_cents=40000, delta_cents=60000)
    assert body["rollforward"]["opening_basis"] == "books_preperiod"
    assert body["rollforward"]["implied_opening_cents"] == 40000


def test_unbalanced_entry_survives_run_all(session):
    job, result, body = evidence(session, "unbalanced_je")
    finding, = [f for f in body["findings"] if f["detector_id"] == "unbalanced_entry"]
    assert finding["amount_cents"] == 6000
    assert result["finding_counts_by_detector"]["unbalanced_entry"]["FAIL"] == 1
    assert result["finding_counts"]["FAIL"] == sum(f["severity"] == "FAIL" for f in body["findings"])


def test_run_all_idempotent_finding_count(session):
    job, first, body = evidence(session, "d4_unmatched")
    path = Path(first["evidence_json"])
    content = path.read_bytes()
    ids = [f["id"] for f in body["findings"]]
    assert run_all(session, job.id) == first
    assert path.read_bytes() == content
    assert [f["id"] for f in json.loads(content)["findings"]] == ids
    assert len(session.scalars(select(EvidencePack)).all()) == 1
    assert list(path.parent.glob("evidence*.json")) == [path]
    assert not list(path.parent.glob("*.tmp"))


@pytest.mark.parametrize("name", ["happy", "d1_opening_break", "d2_edited_after_clear", "d3_duplicate", "d4_unmatched", "d5_after_close", "no_timestamps"])
def test_evidence_never_says_compliant(session, name):
    _, result, body = evidence(session, name)
    raw = Path(result["evidence_json"]).read_text().lower()
    assert not any(word in raw for word in ("gaap compliant", "ifrs compliant", "sox-ready", "certified"))
    assert [(f["detector_id"], f["id"]) for f in body["findings"]] == sorted((f["detector_id"], f["id"]) for f in body["findings"])
    assert all(isinstance(f["payload"], dict) and isinstance(f["cite_line_ids"], list) for f in body["findings"])


def test_hashes_in_evidence_match_files(session):
    job, _, body = evidence(session, "happy")
    for kind in ("bank", "gl"):
        digest = sha256((fixtures_dir / "happy" / (kind + ".csv")).read_bytes()).hexdigest()
        assert digest == getattr(job, f"input_{kind}_sha256") == body["job"][f"input_{kind}_sha256"]


def test_relative_mode_and_unknown_actions(session):
    job = ingest_fixture("no_timestamps", session)
    job.expected_opening_cash_cents = None
    job.period_close_date = None
    result = run_all(session, job.id)
    body = json.loads(Path(result["evidence_json"]).read_text())
    assert body["job"]["period_close_date"] is None
    assert body["rollforward"]["opening_cash_cents"] is None
    assert body["rollforward"]["bank_vs_gl_ok"] is None
    assert body["rollforward"]["ending_cash_cents"] == 25000
    assert body["proposed_review_actions"] == []
    assert all(f["severity"] == "UNKNOWN" for f in body["findings"])


def test_missing_and_failed_jobs_rejected(session):
    with pytest.raises(RunError, match="job not found"):
        run_all(session, "missing")
    job = ingest_fixture("happy", session)
    job.status = "failed"
    session.commit()
    with pytest.raises(RunError, match="cannot run failed job"):
        run_all(session, job.id)
    assert not evidence_path(job.id).exists()
    assert session.get(Job, job.id).status == "failed"


@pytest.mark.parametrize("existing", [False, True])
def test_failed_detector_commit_restores_evidence(session, monkeypatch, existing):
    job = ingest_fixture("d4_unmatched", session)
    path = evidence_path(job.id)
    if existing:
        run_all(session, job.id)
    prior_bytes = path.read_bytes() if existing else None
    prior_ids = {f.id for f in session.scalars(select(Finding))}
    commit = session.commit
    calls = 0
    def fail():
        nonlocal calls
        calls += 1
        if calls == 2: raise RuntimeError("evidence commit failed")
        commit()
    monkeypatch.setattr(session, "commit", fail)
    with pytest.raises(RuntimeError, match="evidence commit failed"):
        run_all(session, job.id)
    assert (path.read_bytes() if path.exists() else None) == prior_bytes
    assert {f.id for f in session.scalars(select(Finding))} == prior_ids
    assert len(session.scalars(select(EvidencePack)).all()) == int(existing)
    assert job.status == ("detected" if existing else "replayed")


def test_file_replacement_failure_rolls_back(session, monkeypatch):
    job, result, _ = evidence(session, "happy")
    path = Path(result["evidence_json"])
    original = path.read_bytes()
    module = importlib.import_module("ledgertrace.evidence.pack")
    def fail(*args): raise OSError("disk failure")
    monkeypatch.setattr(module, "atomic_write", fail)
    with pytest.raises(OSError, match="disk failure"):
        run_all(session, job.id)
    assert path.read_bytes() == original
    assert session.scalars(select(Finding)).all() == []


def test_job_isolation_and_no_journal_postings(session):
    first, result, _ = evidence(session, "d4_unmatched")
    original = Path(result["evidence_json"]).read_bytes()
    second = ingest_fixture("happy", session)
    before = [(l.id, l.debit_cents, l.credit_cents) for l in session.scalars(select(JournalLine).order_by(JournalLine.id))]
    run_all(session, second.id)
    assert [(l.id, l.debit_cents, l.credit_cents) for l in session.scalars(select(JournalLine).order_by(JournalLine.id))] == before
    assert Path(result["evidence_json"]).read_bytes() == original
    assert len(session.scalars(select(EvidencePack)).all()) == 2


def test_local_run_and_get_api(session, engine):
    job = ingest_fixture("happy", session)
    def override():
        with Session(engine, expire_on_commit=False, autoflush=False) as local:
            yield local
    app.dependency_overrides[db_session] = override
    try:
        with TestClient(app) as client:
            assert client.get("/health").status_code == 200
            url = f"/api/jobs/{job.id}"
            assert client.get(url + "/evidence.json").status_code == 404
            response = client.post(url + "/run")
            assert response.status_code == 200
            downloaded = client.get(url + "/evidence.json")
            assert downloaded.status_code == 200
            assert downloaded.headers["content-type"] == "application/json"
            assert downloaded.json()["rollforward"]["ending_cash_cents"] == 125000
            assert downloaded.content == Path(response.json()["evidence_json"]).read_bytes()
            assert client.post("/api/jobs/missing/run").status_code == 404
            assert client.get("/api/jobs/missing/evidence.json").status_code == 404
            job.status = "failed"
            session.commit()
            assert client.post(url + "/run").status_code == 409
    finally:
        app.dependency_overrides.clear()
