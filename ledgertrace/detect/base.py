"""Shared detector output and scoped, repeatable persistence."""
import json
from typing import Literal
from pydantic import BaseModel, Field, PrivateAttr, StrictInt, model_validator
from sqlalchemy import delete, select
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import Job, BankLine, JournalEntry, JournalLine, Finding, Match
from ledgertrace.money import LIMIT

D1_D4_IDS = frozenset({"beginning_balance_break", "unmatched_bank", "unmatched_gl"})
D2_D5_IDS = frozenset({"edited_after_clear", "period_mutation"})
DETECTOR_IDS = D1_D4_IDS | D2_D5_IDS


class DetectorError(ValueError):
    pass


class FindingOut(BaseModel):
    detector_id: str
    severity: Literal["FAIL", "UNKNOWN", "INFO"]
    title: str
    amount_cents: StrictInt | None = Field(default=None, ge=-LIMIT, le=LIMIT)
    cite_bank_ids: list[str] = Field(default_factory=list)
    cite_line_ids: list[str] = Field(default_factory=list)
    cite_entry_ids: list[str] = Field(default_factory=list)
    payload: dict = Field(default_factory=dict)
    _stable_suffix: str = PrivateAttr(default="")

    @model_validator(mode="after")
    def source_citations(self):
        if self.severity in ("FAIL", "UNKNOWN") and not (self.cite_bank_ids or self.cite_line_ids or self.cite_entry_ids):
            raise ValueError("FAIL/UNKNOWN findings require source row citations")
        return self


def finding(suffix: str, **values) -> FindingOut:
    result = FindingOut(**values)
    result._stable_suffix = suffix
    return result


def get_job(session, job_id):
    job = session.get(Job, job_id)
    if job is None:
        raise DetectorError("job not found")
    return job


def cash_ids(job):
    try:
        values = json.loads(job.cash_account_ids_json)
    except (ValueError, TypeError) as error:
        raise DetectorError("invalid cash_account_ids") from error
    if not values:
        raise DetectorError("cash_account_ids empty")
    if not isinstance(values, list) or any(not isinstance(v, str) or not v.strip() or v == "__CASH_TOTAL__" for v in values):
        raise DetectorError("invalid cash_account_ids")
    return set(values)


def source_rows(session, job_id):
    banks = list(session.scalars(select(BankLine).where(BankLine.job_id == job_id)
                                .order_by(BankLine.posted_date, BankLine.id)))
    pairs = session.execute(select(JournalLine, JournalEntry)
        .join(JournalEntry, JournalLine.entry_id == JournalEntry.id)
        .where(JournalLine.job_id == job_id, JournalEntry.job_id == job_id)
        .order_by(JournalEntry.txn_date, JournalEntry.created_at, JournalEntry.id, JournalLine.id)).all()
    return banks, pairs


def citations(banks=(), pairs=()):
    return {"cite_bank_ids": sorted({b.id for b in banks}),
            "cite_line_ids": sorted({line.id for line, _ in pairs}),
            "cite_entry_ids": sorted({entry.id for _, entry in pairs})}


def stable_suffix(result):
    if result._stable_suffix:
        return result._stable_suffix
    payload = result.payload
    if result.detector_id == "beginning_balance_break":
        if "expected_closing_cents" in payload: return "closing"
        if "gl_ending_cents" in payload: return "bank_vs_gl"
        return "opening"
    if result.detector_id == "unmatched_bank" and result.severity == "INFO":
        return f"match:{payload['source_id']}->{payload['source_line_id']}"
    if result.detector_id == "unmatched_bank": return f"bank:{payload['source_id']}"
    if result.detector_id == "unmatched_gl": return f"gl:{payload['source_line_id']}"
    raise DetectorError("unsupported detector_id")


def persist_findings(session, job_id: str, findings: list[FindingOut], *, detector_ids=None) -> None:
    """Replace incoming detector scopes, or explicit scopes even for zero results.

    Each runner supplies its own detector IDs so resolved findings disappear.
    Ingest's unbalanced_entry and other jobs are never in the replacement scope.
    No commit: the runner owns the detector transaction.
    """
    incoming = {f.detector_id for f in findings}
    scope = incoming if detector_ids is None else set(detector_ids)
    if not incoming <= scope or not scope <= DETECTOR_IDS:
        raise DetectorError("invalid finding replacement scope")
    records = []
    ids = set()
    for f in findings:
        identifier = scoped_id(job_id, f"{f.detector_id}:{stable_suffix(f)}")
        if identifier in ids:
            raise DetectorError("duplicate deterministic finding ID")
        ids.add(identifier)
        records.append(Finding(id=identifier, job_id=job_id, detector_id=f.detector_id,
            severity=f.severity, title=f.title, amount_cents=f.amount_cents,
            cite_bank_ids_json=json.dumps(f.cite_bank_ids), cite_line_ids_json=json.dumps(f.cite_line_ids),
            cite_entry_ids_json=json.dumps(f.cite_entry_ids), payload_json=json.dumps(f.payload, sort_keys=True)))
    if scope:
        session.execute(delete(Finding).where(Finding.job_id == job_id, Finding.detector_id.in_(scope)))
    session.add_all(records)
    session.flush()


def persist_matches(session, job_id, rows) -> None:
    """Enforce one-to-one proposals before replacing this job's matches."""
    seen_bank, seen_gl, seen_ids = set(), set(), set()
    for row in rows:
        if row.job_id != job_id or row.bank_line_id in seen_bank or row.journal_line_id in seen_gl or row.id in seen_ids:
            raise DetectorError("matches must be job-scoped and one-to-one")
        seen_bank.add(row.bank_line_id)
        seen_gl.add(row.journal_line_id)
        seen_ids.add(row.id)
    session.execute(delete(Match).where(Match.job_id == job_id))
    session.add_all(rows)
    session.flush()
