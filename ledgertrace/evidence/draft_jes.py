"""Conditional draft suggestions only. Never write journals or send to a GL."""
import json
from sqlalchemy import select
from ledgertrace.db.models import Finding
from ledgertrace.detect.base import get_job
from ledgertrace.replay.engine import load_rollforward

DRAFT_DISCLAIMER = "Draft journals are for review only. LedgerTrace will not post them to QuickBooks, Xero, or any GL."


def build_draft_jes(session, job_id):
    job = get_job(session, job_id)
    cash = json.loads(job.cash_account_ids_json)
    rf = load_rollforward(job_id)
    drafts = []
    def emit(suffix, f, date, note, delta=None, offset="9999", offset_name="Suspense"):
        lines = []
        if delta is not None and delta != 0 and cash:
            amount = abs(delta)
            lines = [dict(account_id=cash[0], debit_cents=amount if delta > 0 else 0,
                          credit_cents=amount if delta < 0 else 0, memo=note),
                     dict(account_id=offset, account_name=offset_name, debit_cents=amount if delta < 0 else 0,
                          credit_cents=amount if delta > 0 else 0, memo=note)]
        drafts.append(dict(draft_id=f"{job_id}:{suffix}", kind="unposted_je" if lines else "inspect_only",
            status="DRAFT_NOT_POSTED", source_finding_ids=[f.id], txn_date=str(date),
            memo="DRAFT - NOT POSTED - professional review required. " + note, lines=lines,
            balanced=bool(lines) and sum(l["debit_cents"] for l in lines) == sum(l["credit_cents"] for l in lines)))
    for f in session.scalars(select(Finding).where(Finding.job_id == job_id, Finding.severity == "FAIL")
                            .order_by(Finding.detector_id, Finding.id)):
        p = json.loads(f.payload_json)
        if f.detector_id == "beginning_balance_break" and {"implied_opening_cents", "expected_opening_cents"} <= p.keys():
            emit("PY-OPEN", f, job.period_start,
                 "If the statement/claim is correct, tie books opening to claimed opening; confirm the cash account and PY treatment.",
                 p["expected_opening_cents"]-p["implied_opening_cents"], "3000", "Opening balance equity")
        elif f.detector_id == "statement_ending_break":
            if rf.bank_vs_gl_ok is True:
                emit("STMT-TIE", f, job.period_end,
                     "If the statement is correct and the missing activity belongs in the GL, inspect this statement tie; confirm the cash account.",
                     p["statement_ending_cents"]-p["bank_rollforward_ending_cents"])
            else:
                emit("STMT-TIE-BANK", f, job.period_end, "Resolve unmatched bank/GL before posting any statement tie. Inspect bank export completeness.")
                emit("STMT-TIE-GL", f, job.period_end, "Resolve unmatched bank/GL before posting any statement tie. Inspect GL reconciliation.")
        elif f.detector_id == "unmatched_bank":
            emit("UNM-BANK-"+p["source_id"], f, p["posted_date"],
                 "Confirm missing GL activity and cash account before using suspense: " + p["description"], f.amount_cents)
        elif f.detector_id == "unmatched_gl":
            emit("UNM-GL-"+p["source_line_id"], f, p["txn_date"],
                 "Cash GL has no bank line; do not post a second entry. Trace or reverse.")
    return drafts
