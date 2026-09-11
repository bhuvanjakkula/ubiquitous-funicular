"""D4: stable greedy one-to-one matches with exact cents; period rows only."""
from collections import defaultdict, deque
import re
from ledgertrace.db.ids import scoped_id
from ledgertrace.db.models import Match
from .base import FindingOut, get_job, cash_ids, source_rows, finding, citations, persist_matches


def normalized_description(value):
    return " ".join(re.sub(r"#\d{5,}", "", (value or "").lower()).split())


def run_d4(session, job_id) -> list[FindingOut]:
    job = get_job(session, job_id)
    cash = cash_ids(job)
    banks, pairs = source_rows(session, job_id)
    banks = [b for b in banks if job.period_start <= b.posted_date <= job.period_end]
    pairs = [(l, e) for l, e in pairs if not e.is_void and l.account_id in cash
             and job.period_start <= e.txn_date <= job.period_end]
    exact, amounts = defaultdict(deque), defaultdict(list)
    for line, entry in pairs:
        amount = line.debit_cents - line.credit_cents
        exact[(entry.txn_date, amount)].append((line, entry))
        amounts[amount].append((line, entry))
    used_bank, used_lines = set(), set()
    proposals, out = [], []

    def match(bank, line, entry, method, confidence, pass_name):
        used_bank.add(bank.id)
        used_lines.add(line.id)
        proposals.append(Match(id=scoped_id(job_id, f"{bank.source_id}->{line.source_line_id}"),
            job_id=job_id, bank_line_id=bank.id, journal_line_id=line.id,
            method=method, confidence=confidence))
        if method != "exact_amount_date" or confidence < 100:
            out.append(finding(f"match:{bank.source_id}->{line.source_line_id}", detector_id="unmatched_bank",
                severity="INFO", title="Matched off-date or by description", amount_cents=bank.amount_cents,
                payload={"source_id": bank.source_id, "source_line_id": line.source_line_id,
                         "pass": pass_name, "days": (bank.posted_date - entry.txn_date).days},
                **citations([bank], [(line, entry)])))

    # Complete exact-date pass for all banks before any off-date candidate consumes a line.
    for bank in banks:
        candidates = exact[(bank.posted_date, bank.amount_cents)]
        if candidates:
            line, entry = candidates.popleft()
            match(bank, line, entry, "exact_amount_date", 100, "A")
    # B: exact signed amount, <=3 calendar days, exactly one remaining GL candidate.
    for bank in banks:
        if bank.id in used_bank:
            continue
        candidates = [(l, e) for l, e in amounts[bank.amount_cents]
                      if l.id not in used_lines and abs((e.txn_date - bank.posted_date).days) <= 3]
        if len(candidates) == 1:
            line, entry = candidates[0]
            match(bank, line, entry, "amount_date_desc", 90, "B")
    # C: only a unique exact normalized description can resolve remaining ambiguity.
    for bank in banks:
        if bank.id in used_bank:
            continue
        desc = normalized_description(bank.description)
        candidates = [(l, e) for l, e in amounts[bank.amount_cents]
                      if l.id not in used_lines and abs((e.txn_date - bank.posted_date).days) <= 3
                      and desc and normalized_description(e.memo) == desc]
        if len(candidates) == 1:
            line, entry = candidates[0]
            match(bank, line, entry, "amount_date_desc", 90, "C")
    for bank in banks:
        if bank.id not in used_bank:
            out.append(finding(f"bank:{bank.source_id}", detector_id="unmatched_bank", severity="FAIL",
                title="Bank line has no cash GL match", amount_cents=bank.amount_cents,
                cite_bank_ids=[bank.id], payload={"source_id": bank.source_id,
                    "posted_date": bank.posted_date.isoformat(), "description": bank.description}))
    for line, entry in pairs:
        if line.id not in used_lines:
            out.append(finding(f"gl:{line.source_line_id}", detector_id="unmatched_gl", severity="FAIL",
                title="Cash GL line has no bank match", amount_cents=line.debit_cents - line.credit_cents,
                cite_line_ids=[line.id], cite_entry_ids=[entry.id],
                payload={"source_line_id": line.source_line_id, "txn_date": entry.txn_date.isoformat(),
                         "account_id": line.account_id}))
    persist_matches(session, job_id, proposals)
    return out
