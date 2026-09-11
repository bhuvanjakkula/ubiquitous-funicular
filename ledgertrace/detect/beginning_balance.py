"""D1: opening evidence, optional closing claim, and bank/GL divergence."""
from ledgertrace.replay.engine import opening_basis, load_rollforward, ReplayError
from .base import DetectorError, FindingOut, get_job, cash_ids, source_rows, citations, finding

ID = "beginning_balance_break"


def run_d1(session, job_id) -> list[FindingOut]:
    """Read replay output; caller must replay after any source/config changes."""
    with session.no_autoflush:
        job = get_job(session, job_id)
        if job.status not in ("replayed", "detected"):
            raise DetectorError("replay required")
        try:
            rf = load_rollforward(job_id)
        except ReplayError as error:
            raise DetectorError("replay required") from error
        cash = cash_ids(job)
        banks, pairs = source_rows(session, job_id)
        active = [(line, entry) for line, entry in pairs if not entry.is_void and line.account_id in cash]
        prior = [(line, entry) for line, entry in active if entry.txn_date < job.period_start]
        period = [(line, entry) for line, entry in active if job.period_start <= entry.txn_date <= job.period_end]
        period_bank = [b for b in banks if job.period_start <= b.posted_date <= job.period_end]
        fallback = citations(banks, pairs)
        if not any(fallback.values()):
            raise DetectorError("source rows required for cited integrity findings")
        out = []
        if job.expected_opening_cash_cents is None:
            out.append(finding("opening", detector_id=ID, severity="UNKNOWN",
                title="Opening cash not provided; cannot test beginning balance",
                payload={"reason": "expected_opening_missing"}, **fallback))
        else:
            mode, value = opening_basis(session, job_id)
            if mode == "books_preperiod" and value != job.expected_opening_cash_cents:
                delta = abs(job.expected_opening_cash_cents - value)
                out.append(finding("opening", detector_id=ID, severity="FAIL",
                    title="Claimed opening cash disagrees with pre-period books", amount_cents=delta,
                    payload={"expected_opening_cents": job.expected_opening_cash_cents,
                             "implied_opening_cents": value, "delta_cents": delta},
                    **citations(pairs=prior)))
        if job.expected_closing_cash_cents is not None and rf.ending_cash_cents != job.expected_closing_cash_cents:
            supporting = citations(period_bank, prior + period)
            out.append(finding("closing", detector_id=ID, severity="FAIL",
                title="Claimed closing cash disagrees with replay ending",
                amount_cents=abs(job.expected_closing_cash_cents - rf.ending_cash_cents),
                payload={"expected_closing_cents": job.expected_closing_cash_cents,
                         "replay_ending_cents": rf.ending_cash_cents},
                **(supporting if any(supporting.values()) else fallback)))
        if rf.bank_vs_gl_ok is False:
            supporting = citations(period_bank, period)
            out.append(finding("bank_vs_gl", detector_id=ID, severity="FAIL",
                title="Cash GL vs bank roll-forward diverge",
                amount_cents=abs((rf.bank_ending_cents or 0) - rf.ending_cash_cents),
                payload={"gl_ending_cents": rf.ending_cash_cents, "bank_ending_cents": rf.bank_ending_cents},
                **(supporting if any(supporting.values()) else fallback)))
        return out
