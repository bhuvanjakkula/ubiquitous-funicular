"""V2.1 is opt-in: statement claims, local CSV dialects, conditional drafts."""
import json
from pathlib import Path
from pypdf import PdfReader
import pytest
from sqlalchemy import select, text
from alembic import command
from ledgertrace.db.models import Job, Finding, BankLine, JournalLine
from ledgertrace.db.session import engine_from_url
from ledgertrace.detect.run_all import run_all
from ledgertrace.replay.engine import load_rollforward
from ledgertrace.ingest.aliases import aliases_for, BANK_ALIASES, GL_ALIASES
from ledgertrace.ingest.errors import IngestError
from ledgertrace.ingest.common import parse_bool
from ledgertrace.api.main import app
from conftest import ingest_fixture
from test_db_models import migration_config
from test_api import api_client, post_job


def run(session, name):
    job = ingest_fixture(name, session)
    result = run_all(session, job.id)
    return job, result, json.loads(Path(result["evidence_json"]).read_text(encoding="utf-8"))


def test_v1_happy_unchanged(session):
    job, result, body = run(session, "happy")
    assert result["finding_counts"]["FAIL"] == 0 and result["matches"] == 3
    assert load_rollforward(job.id).ending_cash_cents == 125000
    assert body["proposed_draft_jes"] == []
    assert not session.scalars(select(Finding).where(Finding.detector_id == "statement_ending_break")).all()
    assert job.export_dialect == "generic"


def test_statement_break_fail(session):
    job, result, body = run(session, "v2_statement_break")
    finding, = body["findings"]
    assert finding["detector_id"] == "statement_ending_break" and finding["amount_cents"] == 5000
    assert finding["payload"] == dict(statement_ending_cents=120000, bank_rollforward_ending_cents=125000,
                                    gl_ending_cents=125000, delta_cents=5000)
    draft, = body["proposed_draft_jes"]
    assert draft["draft_id"].endswith(":STMT-TIE") and draft["balanced"] is True
    assert draft["status"] == "DRAFT_NOT_POSTED"
    assert draft["lines"][0]["credit_cents"] == draft["lines"][1]["debit_cents"] == 5000
    assert "will not post" in body["draft_disclaimer"]
    pdf_text = "\n".join(p.extract_text() for p in PdfReader(result["evidence_pdf"]).pages)
    assert "NOT POSTED" in pdf_text and "statement" in pdf_text.lower()
    assert "Draft journals (not posted)" in pdf_text


@pytest.mark.parametrize("fixture", ["v2_qbo_headers", "v2_xero_headers"])
def test_dialect_happy_equivalent(session, fixture):
    job, result, body = run(session, fixture)
    assert result["finding_counts"]["FAIL"] == 0 and result["matches"] == 3
    assert load_rollforward(job.id).ending_cash_cents == 125000
    assert {b.source_id for b in session.scalars(select(BankLine))} == {"b1", "b2", "b3"}
    assert body["proposed_draft_jes"] == []


def test_draft_opening_on_d1(session):
    _, _, body = run(session, "d1_opening_break")
    draft, = body["proposed_draft_jes"]
    assert draft["draft_id"].endswith(":PY-OPEN") and draft["balanced"]
    assert draft["lines"][0]["debit_cents"] == draft["lines"][1]["credit_cents"] == 60000
    assert "If the statement/claim is correct" in draft["memo"]


def test_draft_unmatched_bank_on_d4(session):
    _, _, body = run(session, "d4_unmatched")
    bank, = [d for d in body["proposed_draft_jes"] if "UNM-BANK" in d["draft_id"]]
    assert bank["kind"] == "unposted_je" and bank["balanced"]
    assert bank["lines"][0]["credit_cents"] == bank["lines"][1]["debit_cents"] == 12345
    gl, = [d for d in body["proposed_draft_jes"] if "UNM-GL" in d["draft_id"]]
    assert gl["kind"] == "inspect_only" and gl["lines"] == []
    assert "do not post a second entry" in gl["memo"]


@pytest.mark.parametrize("opening,statement,severity", [(100000,125000,None),(None,25000,"UNKNOWN"),(None,None,None),(100000,130000,"FAIL")])
def test_statement_absolute_basis(session, opening, statement, severity):
    job=ingest_fixture("happy",session)
    job.expected_opening_cash_cents=opening
    job.expected_bank_statement_ending_cents=statement
    result=run_all(session,job.id)
    fs=session.scalars(select(Finding).where(Finding.detector_id=="statement_ending_break")).all()
    assert [f.severity for f in fs] == ([] if severity is None else [severity])
    if statement==130000:
        draft,=json.loads(Path(result["evidence_json"]).read_text())["proposed_draft_jes"]
        assert draft["lines"][0]["debit_cents"]==5000 and draft["lines"][1]["credit_cents"]==5000


def test_statement_divergence_only_inspect(session):
    job=ingest_fixture("d4_unmatched",session)
    job.expected_bank_statement_ending_cents=120000
    result=run_all(session,job.id)
    drafts=json.loads(Path(result["evidence_json"]).read_text())["proposed_draft_jes"]
    ties=[d for d in drafts if "STMT-TIE" in d["draft_id"]]
    assert len(ties)==2
    assert all(d["kind"]=="inspect_only" and d["lines"]==[] for d in ties)


def test_opening_negative_delta_and_idempotence_no_posting(session):
    job=ingest_fixture("d1_opening_break",session)
    job.expected_opening_cash_cents=20000
    before=[(l.id,l.debit_cents,l.credit_cents) for l in session.scalars(select(JournalLine))]
    result=run_all(session,job.id)
    body=json.loads(Path(result["evidence_json"]).read_text())
    draft,=body["proposed_draft_jes"]
    assert draft["lines"][0]["credit_cents"]==20000 and draft["lines"][1]["debit_cents"]==20000
    assert run_all(session,job.id)==result
    assert json.loads(Path(result["evidence_json"]).read_text())["proposed_draft_jes"]==body["proposed_draft_jes"]
    assert [(l.id,l.debit_cents,l.credit_cents) for l in session.scalars(select(JournalLine))]==before


def test_alias_isolation_and_marks():
    bank,gl=aliases_for("qbo")
    assert "fitid" in bank["bank_line_id"] and "trans #" in gl["journal_id"]
    bank["amount"].add("test-only")
    assert "test-only" not in BANK_ALIASES["amount"]
    assert "trans #" not in GL_ALIASES["journal_id"]
    assert all(parse_bool(mark) is True for mark in ("R","C","Y","✓"))
    with pytest.raises(IngestError,match="unknown export_dialect"): aliases_for("bad")


def test_api_config_v2_and_no_post_routes(api_client):
    response=post_job(api_client,"v2_statement_break")
    assert response.status_code==201
    job_id=response.json()["job_id"]
    result=api_client.post(f"/api/jobs/{job_id}/run")
    assert result.status_code==200 and result.json()["finding_counts"]["by_detector"]["statement_ending_break"]==1
    assert all(not any(term in path.lower() for term in ("post","qbo","xero")) for path in app.openapi()["paths"])


def test_migration_preserves_v1_rows(tmp_path):
    url="sqlite:///"+(tmp_path/"migration.db").as_posix()
    cfg=migration_config(url)
    command.upgrade(cfg,"0001")
    engine=engine_from_url(url)
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO jobs (id,entity_name,currency,period_start,period_end,cash_account_ids_json,status,software_version) VALUES ('old','Acme','USD','2025-01-01','2025-12-31','[]','ingested','0.1.0')"))
        connection.execute(text("INSERT INTO bank_lines (id,job_id,source_id,posted_date,amount_cents,currency,description,file_row) VALUES ('bank','old','b1','2025-01-01',50000,'USD','Deposit',1)"))
    engine.dispose()
    command.upgrade(cfg,"head")
    engine=engine_from_url(url)
    with engine.connect() as connection:
        assert connection.execute(text("SELECT export_dialect,expected_bank_statement_ending_cents FROM jobs WHERE id='old'")).one()==('generic',None)
        assert connection.scalar(text("SELECT amount_cents FROM bank_lines WHERE id='bank'"))==50000
    engine.dispose()
    command.downgrade(cfg,"0001")
    engine=engine_from_url(url)
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM jobs"))==1
        assert connection.scalar(text("SELECT count(*) FROM bank_lines"))==1
    engine.dispose()


def test_unknown_dialect_api_error(api_client):
    from conftest import fixtures_dir
    config=json.loads((fixtures_dir/"happy/job.json").read_text())
    config["export_dialect"]="invalid"
    files={kind:(kind+".csv",(fixtures_dir/"happy"/(kind+".csv")).read_bytes()) for kind in ("bank","gl")}
    response=api_client.post("/api/jobs", files=files, data={"config":json.dumps(config)})
    assert response.status_code==400 and response.json()["detail"]["code"]=="INGEST_ERROR"


def test_resolved_statement_finding_and_draft_removed(session):
    job, result, body=run(session,"v2_statement_break")
    assert body["proposed_draft_jes"]
    job.expected_bank_statement_ending_cents=125000
    result=run_all(session,job.id)
    body=json.loads(Path(result["evidence_json"]).read_text())
    assert body["findings"]==body["proposed_draft_jes"]==[]


def test_dialect_split_bank_and_source_aliases(tmp_path):
    from ledgertrace.ingest.csv_bank import parse_bank
    from ledgertrace.ingest.csv_gl import parse_gl
    bank,gl=aliases_for("qbo")
    p=tmp_path/"bank.csv"
    p.write_text("Posted On,Spend,Receive,Bank Detail,Ref No.\n2025-01-15,,500.00,Receipt,b1\n")
    assert parse_bank(p,aliases=bank)[0]["amount_cents"]==50000
    p=tmp_path/"gl.csv"
    p.write_text("Transaction #,Date,Account #,Debit,Credit,Name,Clr,Split ID\nj1,2025-01-15,1000,500,0,Receipt,C,l1\n")
    row,=parse_gl(p,aliases=gl)
    assert row["memo"]=="Receipt" and row["cleared_flag"] is True and row["source_line_id"]=="l1"
