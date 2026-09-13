"""Optional statement claim against an absolute bank roll-forward."""
from ledgertrace.replay.engine import load_rollforward
from .base import get_job, source_rows, citations, finding


def run_statement_ending(session, job_id):
    job = get_job(session, job_id)
    claimed = job.expected_bank_statement_ending_cents
    if claimed is None: return []
    rf = load_rollforward(job_id)
    banks, pairs = source_rows(session, job_id)
    cites = citations(banks=banks, pairs=pairs if not banks else ())
    if rf.bank_ending_cents is None or rf.bank_opening_cents is None:
        return [finding("statement", detector_id="statement_ending_break", severity="UNKNOWN",
            title="Absolute bank ending unknown without opening cash",
            payload={"reason": "no_absolute_bank_ending"}, **cites)]
    if claimed == rf.bank_ending_cents: return []
    return [finding("statement", detector_id="statement_ending_break", severity="FAIL",
        title="Bank statement ending disagrees with bank roll-forward",
        amount_cents=abs(claimed-rf.bank_ending_cents), payload={
            "statement_ending_cents": claimed, "bank_rollforward_ending_cents": rf.bank_ending_cents,
            "gl_ending_cents": rf.ending_cash_cents, "delta_cents": abs(claimed-rf.bank_ending_cents)}, **cites)]
