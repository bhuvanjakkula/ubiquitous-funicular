"""Final V1 gate: canonical fixtures, real PDF evidence, and frozen scope."""
import json
from pathlib import Path
from pypdf import PdfReader
from sqlalchemy import select
from ledgertrace.db.models import Finding, Match, EvidencePack
from ledgertrace.detect.run_all import run_all
from ledgertrace.detect.base import DETECTOR_IDS
from ledgertrace.replay.engine import load_rollforward
from ledgertrace.api.main import app
from conftest import ingest_fixture


def _run_fixture(session, name):
    job = ingest_fixture(name, session)
    run_all(session, job.id)
    return job


def _fails(session, job_id, detector=None):
    query = select(Finding).where(Finding.job_id == job_id, Finding.severity == "FAIL")
    if detector:
        query = query.where(Finding.detector_id == detector)
    return list(session.scalars(query))


def test_a2_happy_zero_fail(session):
    job = _run_fixture(session, "happy")
    assert _fails(session, job.id) == []
    matches = list(session.scalars(select(Match).where(Match.job_id == job.id)))
    assert len(matches) == 3
    assert all(m.method == "exact_amount_date" for m in matches)
    rf = load_rollforward(job.id)
    assert rf.opening_cash_cents == 100000
    assert rf.period_cash_movement_cents == 25000
    assert rf.ending_cash_cents == 125000
    assert rf.identity_ok is True and rf.bank_vs_gl_ok is True


def test_a3_d1(session):
    job = _run_fixture(session, "d1_opening_break")
    findings = _fails(session, job.id, "beginning_balance_break")
    assert any(f.amount_cents == 60000 and json.loads(f.payload_json) == {
        "expected_opening_cents": 100000, "implied_opening_cents": 40000, "delta_cents": 60000}
        for f in findings)
    rf = load_rollforward(job.id)
    assert rf.ending_cash_cents == 125000 and rf.identity_ok is True


def test_a3_d2(session):
    job = _run_fixture(session, "d2_edited_after_clear")
    findings = _fails(session, job.id, "edited_after_clear")
    assert any(f.amount_cents == -20000 and job.id + ":l4" in json.loads(f.cite_line_ids_json) for f in findings)


def test_a3_d3(session):
    job = _run_fixture(session, "d3_duplicate")
    findings = _fails(session, job.id, "duplicate_event")
    assert len(findings) == 2
    assert {(json.loads(f.payload_json)["kind"], f.amount_cents) for f in findings} == {("bank", 25000), ("gl", 25000)}
    for f in findings:
        banks = json.loads(f.cite_bank_ids_json)
        lines = json.loads(f.cite_line_ids_json)
        entries = json.loads(f.cite_entry_ids_json)
        assert not any(":b_rev" in identifier or ":j_r" in identifier or ":l_r" in identifier
                       for identifier in banks + lines + entries)
        if json.loads(f.payload_json)["kind"] == "bank":
            assert set(banks) == {job.id + ":b_dup1", job.id + ":b_dup2"}
        else:
            assert set(lines) == {job.id + ":l_d1a", job.id + ":l_d2a"}


def test_a3_d4(session):
    job = _run_fixture(session, "d4_unmatched")
    assert any(f.amount_cents == -12345 for f in _fails(session, job.id, "unmatched_bank"))
    assert any(f.amount_cents == 20000 for f in _fails(session, job.id, "unmatched_gl"))
    rf = load_rollforward(job.id)
    assert rf.ending_cash_cents == 145000 and rf.bank_ending_cents == 112655
    assert rf.identity_ok is True and rf.bank_vs_gl_ok is False


def test_a3_d5(session):
    job = _run_fixture(session, "d5_after_close")
    findings = _fails(session, job.id, "period_mutation")
    assert any(f.title == "Period books mutated after close date" and
               job.id + ":j5" in json.loads(f.cite_entry_ids_json) for f in findings)
    assert any(f.title == "Backdated entry created after close" and
               job.id + ":j6" in json.loads(f.cite_entry_ids_json) for f in findings)


def test_a4_pdf_disclaimer_and_hashes(session):
    job = _run_fixture(session, "happy")
    pack = session.get(EvidencePack, job.id + ":evidence")
    assert pack is not None
    path = Path(pack.pdf_path)
    assert path.read_bytes().startswith(b"%PDF")
    text = "\n".join(page.extract_text() for page in PdfReader(path).pages).lower()
    assert "unposted workpaper" in text
    assert "does not certify gaap" in text and "does not post" in text
    assert job.input_bank_sha256.lower() in text
    assert job.input_gl_sha256.lower() in text
    assert not any(term in text for term in ("gaap compliant", "ifrs compliant", "sox-ready", "certified"))


def test_a5_readme():
    text = (Path(__file__).resolve().parents[1] / "README.md").read_text(encoding="utf-8").lower()
    assert "does not post" in text and "does not certify gaap" in text
    assert "127.0.0.1" in text and "0.0.0.0" not in text
    assert "local only" in text and "not a compliance certificate" in text
    assert "demo - happy path" in text and "scripts/demo_happy.py" in text
    assert not any(term in text for term in ("sox-ready", "posts journals", "qbo connector", "xero connector"))


def test_frozen_detector_and_api_scope():
    assert DETECTOR_IDS == {"beginning_balance_break", "edited_after_clear", "duplicate_event",
                            "unmatched_bank", "unmatched_gl", "period_mutation"}
    posts = {path for path, operations in app.openapi()["paths"].items() if "post" in operations}
    assert posts == {"/api/jobs", "/api/jobs/{job_id}/run"}
    root = Path(__file__).resolve().parents[1] / "ledgertrace"
    assert not any(term in path.stem.lower() for path in root.rglob("*.py")
                   for term in ("qbo", "xero", "netsuite", "plaid", "electron"))
