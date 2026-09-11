"""D3: exact same-stream signatures after one-to-one reversal exclusion.

The pasted brief lost the candidate/filter expressions and a regex pattern.
Candidates are in-period bank rows and non-void cash GL lines. Description
normalization removes 5+ digit runs and replaces punctuation with whitespace.
Reversals need opposite nonzero amounts within three days, plus a reversal
memo on either record or an explicit GL reverses_id. Each record is consumed
at most once. Explicit links take precedence, then chronological/ID order.
"""
from collections import defaultdict
from bisect import bisect_left, bisect_right
from dataclasses import dataclass
from datetime import date
from hashlib import sha256
import json
import re
from .base import FindingOut, cash_ids, citations, finding, get_job, source_rows


def norm_desc(s: str) -> str:
    s = re.sub(r"\d{5,}", "", (s or "").lower())
    return " ".join(re.sub(r"[^\w\s]", " ", s).split())


def is_reversal_memo(s: str) -> bool:
    return any(word in (s or "").upper() for word in ("VOID", "REVERSE", "REVERSAL", "CANCEL"))


@dataclass(frozen=True)
class Event:
    id: str
    source_id: str
    day: date
    amount: int
    memo: str
    account_id: str = ""
    entry_id: str | None = None
    reverses_id: str | None = None

    @property
    def signature(self):
        return (self.day.isoformat(), self.amount, self.account_id, norm_desc(self.memo))


def without_reversals(events):
    """Deterministic one-to-one pairing, isolated within the caller's stream."""
    buckets = defaultdict(list)
    for event in events:
        if event.amount:
            buckets[event.amount].append(event)
    for bucket in buckets.values():
        bucket.sort(key=lambda e: (e.day, e.id))
    dates = {amount: [e.day.toordinal() for e in bucket] for amount, bucket in buckets.items()}
    proposals = []
    for event in events:
        if event.amount <= 0:
            continue
        opposite = buckets.get(-event.amount, [])
        days = dates.get(-event.amount, [])
        day = event.day.toordinal()
        for other in opposite[bisect_left(days, day - 3):bisect_right(days, day + 3)]:
            if event.entry_id is not None and event.entry_id == other.entry_id:
                continue  # journal splits are not a reversal of another entry
            linked = (event.entry_id is not None and
                      (event.reverses_id == other.entry_id or other.reverses_id == event.entry_id))
            if linked or is_reversal_memo(event.memo) or is_reversal_memo(other.memo):
                first, second = sorted((event, other), key=lambda e: (e.day, e.id))
                proposals.append((not linked, first.day, first.id, second.day, second.id, event.id, other.id))
    dropped = set()
    for *_, first, second in sorted(proposals):
        if first not in dropped and second not in dropped:
            dropped.update((first, second))
    return [event for event in events if event.id not in dropped]


def run_d3(session, job_id) -> list[FindingOut]:
    job = get_job(session, job_id)
    banks, pairs = source_rows(session, job_id)
    if json.loads(job.cash_account_ids_json) == []:
        return [finding("cash_accounts", detector_id="duplicate_event", severity="UNKNOWN",
                        title="no cash accounts configured", **citations(banks=banks, pairs=pairs))]
    cash = cash_ids(job)
    bank_events = [Event(b.id, b.source_id, b.posted_date, b.amount_cents, b.description or "")
                   for b in banks if job.period_start <= b.posted_date <= job.period_end]
    gl_events = [Event(l.id, l.source_line_id, e.txn_date, l.debit_cents - l.credit_cents,
                       e.memo or "", l.account_id, e.id, e.reverses_id)
                 for l, e in pairs if not e.is_void and l.account_id in cash
                 and job.period_start <= e.txn_date <= job.period_end]
    out = []
    for kind, events in (("bank", bank_events), ("gl", gl_events)):
        events = without_reversals(events)
        groups = defaultdict(list)
        for event in events:
            groups[event.signature].append(event)
        failed = set()
        for signature, cluster in sorted(groups.items()):
            if len(cluster) < 2 or (kind == "gl" and len({e.entry_id for e in cluster}) < 2):
                continue
            cluster.sort(key=lambda e: (e.day, e.id))
            day, amount, account, desc = signature
            digest = sha256(desc.encode("utf-8")).hexdigest()[:8]
            suffix = f"bank:{day}:{amount}:{digest}" if kind == "bank" else f"gl:{day}:{amount}:{account}:{digest}"
            values = dict(date=day, amount_cents=amount, description=desc)
            if kind == "gl":
                values["account_id"] = account
            out.append(finding(suffix, detector_id="duplicate_event", severity="FAIL",
                title="Duplicate bank economic event" if kind == "bank" else "Duplicate cash GL economic event",
                amount_cents=abs(amount),
                cite_bank_ids=[e.id for e in cluster] if kind == "bank" else [],
                cite_line_ids=[e.id for e in cluster] if kind == "gl" else [],
                cite_entry_ids=sorted({e.entry_id for e in cluster}) if kind == "gl" else [],
                payload=dict(kind=kind, signature=values, source_ids=[e.source_id for e in cluster],
                             dates=[e.day.isoformat() for e in cluster])))
            failed.update(e.id for e in cluster)
        if kind == "bank":
            amounts = defaultdict(list)
            for event in events:
                if event.id not in failed:
                    amounts[(event.day.isoformat(), event.amount)].append(event)
            for (day, amount), cluster in sorted(amounts.items()):
                if len({norm_desc(e.memo) for e in cluster}) < 2:
                    continue
                cluster.sort(key=lambda e: e.id)
                out.append(finding(f"bankamt:{day}:{amount}", detector_id="duplicate_event", severity="INFO",
                    title="Possible duplicate bank amounts same day", amount_cents=abs(amount),
                    cite_bank_ids=[e.id for e in cluster],
                    payload=dict(kind="bank_same_amount", signature=dict(date=day, amount_cents=amount),
                                 source_ids=[e.source_id for e in cluster], dates=[day for e in cluster])))
    return out
