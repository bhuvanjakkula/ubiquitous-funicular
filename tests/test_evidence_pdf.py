from pathlib import Path
from io import BytesIO
import pytest
from pypdf import PdfReader
from ledgertrace.detect.run_all import run_all
from conftest import ingest_fixture


@pytest.mark.parametrize("fixture,detector", [("happy",None),("d1_opening_break","beginning_balance_break"),
    ("d2_edited_after_clear","edited_after_clear"),("d3_duplicate","duplicate_event"),
    ("d4_unmatched","unmatched_bank"),("d5_after_close","period_mutation")])
def test_pdf_acceptance(session,fixture,detector):
    job=ingest_fixture(fixture,session)
    result=run_all(session,job.id)
    raw=Path(result["evidence_pdf"]).read_bytes()
    assert raw.startswith(b"%PDF")
    text="\n".join(page.extract_text() for page in PdfReader(BytesIO(raw)).pages)
    assert "Does not certify GAAP" in text and "Does not post" in text
    assert job.input_bank_sha256 in text and job.input_gl_sha256 in text
    assert "UNPOSTED WORKPAPER - FOR REVIEW ONLY" in text
    if detector: assert result["finding_counts_by_detector"][detector]["FAIL"] >= 1
    else: assert result["finding_counts"]["FAIL"] == 0
