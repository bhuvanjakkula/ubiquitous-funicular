"""Sparse, deterministic cash replay; supplied opening is as of period start."""
from dataclasses import asdict, dataclass
from itertools import groupby
import json
import os
from pathlib import Path
import re
import tempfile

from sqlalchemy import delete, select
from ledgertrace.db.models import Job, JournalLine, JournalEntry, BankLine, ReplayBalance
from ledgertrace.money import LIMIT


class ReplayError(ValueError):
    pass


@dataclass(frozen=True)
class RollForward:
    opening_cash_cents: int | None
    period_cash_movement_cents: int
    ending_cash_cents: int
    bank_opening_cents: int | None
    bank_movement_cents: int
    bank_ending_cents: int | None
    identity_ok: bool
    bank_vs_gl_ok: bool | None
    notes: tuple[str, ...]


def rollforward_path(job_id: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", job_id):
        raise ReplayError("invalid job_id")
    return Path(os.environ.get("LEDGERTRACE_DATA_DIR", "data")) / "jobs" / job_id / "rollforward.json"


def load_rollforward(job_id: str) -> RollForward:
    try:
        values = json.loads(rollforward_path(job_id).read_text(encoding="utf-8"))
        values["notes"] = tuple(values["notes"])
        return RollForward(**values)
    except (OSError, ValueError, TypeError, KeyError) as error:
        raise ReplayError(f"cannot load roll-forward for {job_id}: {error}") from error


def checked(value: int) -> int:
    if type(value) is not int or abs(value) > LIMIT:
        raise ReplayError("balance exceeds signed integer cents range")
    return value


def replay_job(session, job_id: str) -> RollForward:
    """Commit replay rows and JSON. Use a dedicated session for this operation."""
    temporary = None
    replaced = False
    old_json = None
    path = None
    try:
        # Explicit flush supports caller edits even with autoflush=False.
        session.flush()
        job = session.get(Job, job_id)
        if job is None:
            raise ReplayError("job not found")
        cash_list = json.loads(job.cash_account_ids_json)
        if not cash_list:
            raise ReplayError("cash_account_ids empty")
        if not isinstance(cash_list, list) or any(not isinstance(x, str) or not x.strip() or x == "__CASH_TOTAL__" for x in cash_list):
            raise ReplayError("invalid cash_account_ids")
        cash_ids = set(cash_list)
        accounts = sorted(cash_ids | {"__CASH_TOTAL__"})
        opening = job.expected_opening_cash_cents
        running = {"__CASH_TOTAL__": checked(opening if opening is not None else 0)}
        if opening is not None and len(cash_ids) == 1:
            running[next(iter(cash_ids))] = opening
        pairs = session.execute(
            select(JournalLine, JournalEntry)
            .join(JournalEntry, JournalLine.entry_id == JournalEntry.id)
            .where(JournalLine.job_id == job_id, JournalEntry.job_id == job_id,
                   JournalEntry.is_void.is_(False), JournalEntry.txn_date <= job.period_end)
            .order_by(JournalEntry.txn_date, JournalEntry.created_at, JournalEntry.id, JournalLine.id)
        ).all()
        snapshots = {}
        def snapshot(day):
            snapshots[day] = {account: running.get(account, 0) for account in accounts}

        period_movement = 0
        all_cash_movement = 0
        start_written = False
        for day, rows in groupby(pairs, key=lambda pair: pair[1].txn_date):
            if day >= job.period_start and not start_written:
                snapshot(job.period_start)
                start_written = True
            cash_moved = False
            for line, entry in rows:
                delta = line.debit_cents - line.credit_cents
                cash = line.account_id in cash_ids
                if cash:
                    all_cash_movement += delta
                    if day < job.period_start and opening is not None:
                        continue  # Already included in the supplied start-of-period balance.
                    if day >= job.period_start:
                        period_movement += delta
                        cash_moved = cash_moved or delta != 0
                running[line.account_id] = checked(running.get(line.account_id, 0) + delta)
                if cash:
                    running["__CASH_TOTAL__"] = checked(running["__CASH_TOTAL__"] + delta)
            if day >= job.period_start and cash_moved:
                snapshot(day)
        if not start_written:
            snapshot(job.period_start)
        snapshot(job.period_end)
        ending = running["__CASH_TOTAL__"]
        identity = ((opening + period_movement) if opening is not None else all_cash_movement) == ending
        if not identity:
            raise ReplayError("cash roll-forward identity failed")
        bank_rows = session.scalars(select(BankLine).where(
            BankLine.job_id == job_id, BankLine.posted_date >= job.period_start,
            BankLine.posted_date <= job.period_end,
        ).order_by(BankLine.posted_date, BankLine.id))
        bank_movement = sum(row.amount_cents for row in bank_rows)
        bank_ending = checked((opening if opening is not None else 0) + bank_movement)
        notes = []
        if opening is None:
            notes.append("absolute bank ending unknown without opening")
        if job.expected_closing_cash_cents is not None and ending != job.expected_closing_cash_cents:
            notes.append("closing_mismatch")
        result = RollForward(opening, period_movement, ending, opening, bank_movement,
                             bank_ending, identity, bank_ending == ending if opening is not None else None,
                             tuple(notes))
        path = rollforward_path(job_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        old_json = path.read_bytes() if path.exists() else None
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=path.parent,
                                         prefix=".rollforward-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(asdict(result), stream, sort_keys=True, indent=2)
            stream.write("\n")
        session.execute(delete(ReplayBalance).where(ReplayBalance.job_id == job_id))
        for day, balances in sorted(snapshots.items()):
            for account, balance in balances.items():
                session.add(ReplayBalance(job_id=job_id, account_id=account, as_of_date=day, balance_cents=balance))
        if job.status == "ingested":
            job.status = "replayed"
        session.flush()
        os.replace(temporary, path)
        replaced = True
        session.commit()
        return result
    except Exception as error:
        session.rollback()
        if replaced:
            if old_json is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(old_json)
        if isinstance(error, ReplayError):
            raise
        raise ReplayError(str(error)) from error
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
