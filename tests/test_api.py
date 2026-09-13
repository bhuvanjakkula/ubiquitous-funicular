"""Local API wiring including the subsequently authorized PDF generator."""
import csv
import io
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from ledgertrace.api.main import app
from ledgertrace.db.models import Job, EvidencePack
from conftest import fixtures_dir


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    monkeypatch.setenv("LEDGERTRACE_DATABASE_URL", "sqlite:///" + (tmp_path / "api.db").as_posix())
    monkeypatch.setenv("LEDGERTRACE_DATA_DIR", str(tmp_path / "api-data"))
    with TestClient(app) as client:
        yield client


def post_job(client, fixture_name="happy", config_kind="config", gl_bytes=None):
    folder = fixtures_dir / fixture_name
    files = {"bank": ("bank.csv", (folder / "bank.csv").read_bytes(), "text/csv"),
             "gl": ("gl.csv", gl_bytes if gl_bytes is not None else (folder / "gl.csv").read_bytes(), "text/csv")}
    config = (folder / "job.json").read_bytes()
    if config_kind == "form":
        return client.post("/api/jobs", files=files, data={"config": config.decode()})
    files[config_kind] = ("job.json", config, "application/json")
    return client.post("/api/jobs", files=files)


def test_health(api_client):
    assert api_client.get("/health").json() == {"ok": True, "version": "0.1.0"}


@pytest.mark.parametrize("config_kind", ["config", "job", "form"])
def test_create_happy_job(api_client, config_kind, tmp_path):
    response = post_job(api_client, config_kind=config_kind)
    assert response.status_code == 201
    result = response.json()
    assert result["status"] == "ingested"
    job = api_client.get("/api/jobs/" + result["job_id"]).json()
    assert job["counts"] == dict(bank_lines=3, journal_entries=3, journal_lines=6, matches=0,
                                 findings=0, findings_fail=0, findings_unknown=0, findings_info=0)
    assert job["entity_name"] == "Acme LLC" and job["currency"] == "USD"
    assert job["period_start"] == "2025-01-01" and job["period_end"] == "2025-12-31"
    assert job["error"] is None
    assert len(job["hashes"]["bank"]) == len(job["hashes"]["gl"]) == 64
    assert list((tmp_path / "api-data/uploads").iterdir()) == []


def test_create_missing_gl_header_400(api_client):
    response = post_job(api_client, gl_bytes=b"line_id,txn_date,account_id,debit,credit\nl1,2025-01-01,1000,1,0\n")
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INGEST_ERROR"
    assert "journal_id" in response.json()["detail"]["missing_fields"]
    with app.state.session_factory() as session:
        assert session.scalars(select(Job)).all() == []


@pytest.mark.parametrize("suffix", ["", "/findings", "/rollforward", "/matches", "/evidence.json", "/evidence.pdf"])
def test_get_unknown_job_404(api_client, suffix):
    response = api_client.get("/api/jobs/missing" + suffix)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "NOT_FOUND"
    assert "error" in response.json()["detail"]


def test_run_happy(api_client):
    job_id = post_job(api_client).json()["job_id"]
    url = "/api/jobs/" + job_id
    response = api_client.post(url + "/run")
    assert response.status_code == 200
    assert response.json()["status"] == "detected"
    assert response.json()["finding_counts"] == {"FAIL": 0, "UNKNOWN": 0, "INFO": 0, "by_detector": {}}
    assert response.json()["evidence_pdf"] == url + "/evidence.pdf"
    matches = api_client.get(url + "/matches").json()["items"]
    assert len(matches) == 3
    assert all(set(row) == {"id", "bank_line_id", "journal_line_id", "method", "confidence"} for row in matches)
    rf = api_client.get(url + "/rollforward").json()
    assert rf["ending_cash_cents"] == 125000 and rf["identity_ok"] is True
    assert api_client.get(url).json()["counts"]["matches"] == 3


def test_run_d4(api_client):
    job_id = post_job(api_client, "d4_unmatched").json()["job_id"]
    url = "/api/jobs/" + job_id
    result = api_client.post(url + "/run").json()
    assert result["finding_counts"]["FAIL"] == 3
    assert result["finding_counts"]["by_detector"] == dict(unmatched_bank=1, unmatched_gl=1, beginning_balance_break=1)
    findings = api_client.get(url + "/findings").json()["items"]
    fails = {f["detector_id"]: f for f in findings if f["severity"] == "FAIL"}
    assert fails["unmatched_bank"]["amount_cents"] == -12345
    assert fails["unmatched_gl"]["amount_cents"] == 20000
    assert fails["beginning_balance_break"]["payload"] == dict(gl_ending_cents=145000, bank_ending_cents=112655)
    assert findings == api_client.get(url + "/evidence.json").json()["findings"]
    assert api_client.get(url).json()["counts"]["findings_fail"] == 3


def test_evidence_json_and_pdf(api_client):
    job_id = post_job(api_client).json()["job_id"]
    url = "/api/jobs/" + job_id
    assert api_client.get(url + "/evidence.json").status_code == 404
    api_client.post(url + "/run")
    response = api_client.get(url + "/evidence.json")
    assert response.status_code == 200 and response.headers["content-type"] == "application/json"
    assert response.json()["product"] == "LedgerTrace"
    assert "Does not certify GAAP" in response.json()["disclaimer"]
    response = api_client.get(url + "/evidence.pdf")
    assert response.status_code == 200 and response.content.startswith(b"%PDF")
    assert response.headers["content-type"] == "application/pdf"


def test_existing_pdf_download_route(api_client, tmp_path):
    # Exercise FileResponse with an existing binary artifact; do not implement a PDF generator.
    job_id = post_job(api_client).json()["job_id"]
    api_client.post(f"/api/jobs/{job_id}/run")
    pdf = tmp_path / "existing.pdf"
    contents = b"%PDF-1.4\n% fixture for byte-preserving route test\n%%EOF\n"
    pdf.write_bytes(contents)
    with app.state.session_factory() as session:
        pack = session.get(EvidencePack, job_id + ":evidence")
        pack.pdf_path = str(pdf)
        session.commit()
    response = api_client.get(f"/api/jobs/{job_id}/evidence.pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == contents
    pdf.unlink()
    assert api_client.get(f"/api/jobs/{job_id}/evidence.pdf").status_code == 404


def test_run_twice_ok(api_client):
    job_id = post_job(api_client).json()["job_id"]
    url = "/api/jobs/" + job_id
    first = api_client.post(url + "/run")
    second = api_client.post(url + "/run")
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert len(api_client.get(url + "/matches").json()["items"]) == 3


def test_rollforward_before_run_409(api_client):
    job_id = post_job(api_client).json()["job_id"]
    response = api_client.get(f"/api/jobs/{job_id}/rollforward")
    assert response.status_code == 409 and response.json()["detail"]["code"] == "NOT_READY"


def test_unbalanced_survives_run(api_client):
    job_id = post_job(api_client, "unbalanced_je").json()["job_id"]
    url = "/api/jobs/" + job_id
    result = api_client.post(url + "/run")
    assert result.status_code == 200
    assert result.json()["finding_counts"]["by_detector"]["unbalanced_entry"] == 1
    assert any(f["detector_id"] == "unbalanced_entry" for f in api_client.get(url + "/findings").json()["items"])


def test_failed_job_run_409(api_client):
    job_id = post_job(api_client).json()["job_id"]
    with app.state.session_factory() as session:
        session.get(Job, job_id).status = "failed"
        session.commit()
    response = api_client.post(f"/api/jobs/{job_id}/run")
    assert response.status_code == 409 and response.json()["detail"]["code"] == "FAILED_JOB"


def test_bad_config_and_missing_uploads(api_client):
    folder = fixtures_dir / "happy"
    files = {key: (key + ".csv", (folder / (key + ".csv")).read_bytes()) for key in ("bank", "gl")}
    for config in ("{", "{}"):
        response = api_client.post("/api/jobs", files=files, data={"config": config})
        assert response.status_code == 400 and response.json()["detail"]["code"] == "INGEST_ERROR"
    assert api_client.post("/api/jobs", files=files).status_code == 400
    assert api_client.post("/api/jobs").status_code == 400
    assert api_client.post("/api/jobs/missing/run").status_code == 404


def test_api_no_update_or_delete(api_client):
    job_id = post_job(api_client).json()["job_id"]
    for method in (api_client.put, api_client.delete):
        assert method(f"/api/jobs/{job_id}").status_code == 405
