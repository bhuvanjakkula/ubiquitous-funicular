# LedgerTrace V1 - Day 5

This checkout contains the Day 2 database foundation and Day 3 local CSV ingestion, with Day 4 fixture layouts frozen. The Day 1 money type and `/health` endpoint are retained. Day 5 adds local cash replay. No D1–D5 detectors, matching, job API run route, PDF, or UI are implemented here.

Local only. No GL posting. Not a compliance certificate.

## Day 2

Use Python 3.12 and install the package and test dependencies:

```sh
python -m pip install -e '.[test]'
mkdir -p data
alembic upgrade head
pytest tests/test_db_models.py -q
```

On Windows PowerShell, use `New-Item -ItemType Directory -Force data` in place of `mkdir -p data`. If commands are not on PATH, use `python -m alembic` and `python -m pytest` with your Python 3.12 environment.

The default database is `data/ledgertrace.db`. Alembic reads `sqlalchemy.url` from `alembic.ini`; tests override that URL with temporary SQLite files. Revision `0001` creates exactly ten application tables, plus Alembic's own revision tracking table. `alembic downgrade base` removes application tables in child-first order.

All money columns use INTEGER cents, string primary keys use TEXT, calendar dates use Date, and timestamps use DateTime. **All stored timestamps represent timezone-naive UTC.** Convert source timestamps to UTC before storage; this layer does not perform source-date conversion. `created_in_system_at` has a Python UTC default and a SQLite UTC CURRENT_TIMESTAMP server default.

Every session engine enables SQLite foreign keys. Deletion follows database `ON DELETE CASCADE`; relationships use `back_populates` and `passive_deletes="all"` so loaded children do not cause the ORM to null required foreign keys. `get_session()` commits on success, rolls back on error, and closes the session. `init_engine(url)` rebinds the shared session factory before sessions are opened.

The brief names five job statuses despite saying six: queued, ingested, replayed, detected, failed. Those five are enforced. Day 2 permits zero debit and zero credit together, as specified by its checks; validating an economic journal line is a later ingestion concern.

Next: Day 6 test_replay freeze + d1 fixture.


## Day 3 — local CSV ingestion

Run `pytest tests/test_ingest.py -q`. After `alembic upgrade head`, ingest the happy fixtures from the repository root:

```python
from pathlib import Path
from ledgertrace.db.session import SessionLocal
from ledgertrace.ingest.job_config import load_job_config
from ledgertrace.ingest.service import ingest_job

fixture = Path("tests/fixtures/happy")
config = load_job_config(fixture / "job.json")
with SessionLocal() as session:
    job = ingest_job(session, fixture / "bank.csv", fixture / "gl.csv", config)
    print(job.id, job.status, job.input_bank_sha256, job.input_gl_sha256)
```

`JobConfig` requires at least one cash account and an ordered period. Money is integer cents only; floating-point job balances are rejected. Bank amounts accept signed decimal text, commas, dollar signs, and negative parentheses. Empty split debit/credit fields become zero; required Amount fields cannot be blank. A complete bank debit/credit pair overrides Amount. With only one split column plus Amount, Amount wins. A split-only export may contain one side. GL lines require one positive side and reject negative, dual-sided, or zero-sided lines.

Header normalization lowercases, strips, and collapses inner whitespace. Canonical underscore names are always recognized. Alias sets have no inherent order, so resolution tries the canonical name first, then sorted aliases for deterministic first-match behavior. Duplicate normalized header names use the first original column. All requested aliases are in `ledgertrace/ingest/aliases.py`.

CSV data rows are numbered starting at **1**, excluding the header. Empty bank records with blank date, amounts, and description are skipped; they still occupy a data-row number. Synthetic bank IDs use `filename_stem#data_row`, and synthetic GL line IDs use `journal_id#data_row`. Every stored ID is scoped to the UUID job. CSV parsing uses UTF-8 with optional BOM. Input hashes cover the exact raw byte snapshots that are parsed, including BOM and line endings.

Supported dates are YYYY-MM-DD or M/D/YYYY; timestamps also accept YYYY-MM-DDTHH:MM:SS. Timezone-bearing timestamps are rejected. Timestamps follow Day 2's documented naive-UTC storage convention; callers must provide UTC, and ingestion performs no timezone conversion. Missing creation time uses the transaction date at midnight; missing modification time uses creation time.

Journal grouping uses the first line's accounting date even when dates differ, the earliest creation timestamp, the latest modification timestamp, first nonempty source/memo/reversal reference, and any-line void status. Created/modified users come from the earliest/latest respective line (file row breaks ties). Per-line dates and differing per-line memos are not separately retained because Day 2's fixed schema has entry-level fields only. Bank currency is retained or defaults to the job currency; GL currency must match the job since the fixed GL schema has no per-line currency column. There is no currency translation.

Use a dedicated session for `ingest_job`: it commits the complete success path once. Invalid inputs are collected across both files in `IngestError.errors` (file, data row, field where applicable, and message). Header errors include found headers and missing logical fields, with row 0 denoting headers. Any fatal parse or database failure rolls back all ingest rows; failed jobs are not persisted. Unbalanced journals remain stored and produce `unbalanced_entry` FAIL findings with absolute discrepancy cents and scoped entry/line citations. No recon/edit events or later-day outputs are generated.


## Fixtures

Day 4 freezes CSV layouts for subsequent work. Run `pytest tests/test_ingest.py -q`.
The shared `tests/conftest.py` helper `ingest_fixture(name, session)` ingests only
complete fixtures into a temporary SQLite database. Placeholder directories are
explicitly excluded. The original Day 3 ingest and rollback assertions remain.

| Folder under `tests/fixtures/` | Contents and planned use |
| --- | --- |
| `happy/` | Day 3 baseline, frozen Day 4: 3 bank rows, 3 entries, 6 GL lines, zero findings. Cash deltas are +50000, -20000, -5000 cents. Reused from Day 5 replay onward. |
| `d4_unmatched/` | Frozen Day 4: 4 bank rows, 4 entries, 8 GL lines, zero ingest findings. Bank `b_fee` is -12345 cents; cash GL `l7` is +20000 cents. Matching assertions belong to Day 7. |
| `unbalanced_je/` | Original Day 3 fixture: retained journal and lines, one `unbalanced_entry` FAIL for 6000 cents. |
| `alias_headers/` | Day 4 normalized folder for the former loose `alias_bank.csv`, with matching GL and job files: 2 bank rows, 2 entries, 4 GL lines, zero findings. |
| `d1_opening_break/` | Job defaults and README only. Filled on the detector day; D1 detector is planned for Day 7. Not ingested in Day 4 tests. |
| `d2_edited_after_clear/` | Job defaults and README only; populated with D2 on Day 8. Not ingested in Day 4 tests. |
| `d3_duplicate/` | Job defaults and README only; populated with D3 on Day 9. Not ingested in Day 4 tests. |
| `d5_after_close/` | Job defaults and README only; populated with D5 on Day 8. Not ingested in Day 4 tests. |

`expected_findings.json` contains `fail`, `unknown`, and `info` arrays. The happy
file is empty. The D4 file documents two **future** matching failures using the
Day 4 brief's exact IDs, `unmatched_bank` and `unmatched_gl`; it does not describe
Day 4 ingest output. No matching detector is called and no matches are written.
Ingest findings still contain only the existing unbalanced-journal check.


## Day 5 - replay and cash identity

After ingesting with the Day 3 example, use the same dedicated session:

```python
from ledgertrace.replay.engine import replay_job, load_rollforward

roll = replay_job(session, job.id)
print(roll.ending_cash_cents, roll.identity_ok, roll.bank_vs_gl_ok)
assert load_rollforward(job.id) == roll
```

Run `pytest tests/test_replay.py -q`. No schema migration is required.
The engine writes `data/jobs/{job_id}/rollforward.json`; set
`LEDGERTRACE_DATA_DIR` to change the output root (tests use a temporary directory).
`load_rollforward(job_id)` returns the frozen `RollForward` dataclass.
JSON contains `opening_cash_cents`, `period_cash_movement_cents`,
`ending_cash_cents`, `bank_opening_cents`, `bank_movement_cents`,
`bank_ending_cents`, `identity_ok`, `bank_vs_gl_ok`, and `notes` (a JSON array).

**Expected opening means cash at the start of period_start, before that day's
transactions.** Pre-period cash GL and bank rows are already included in that
opening and are ignored. Without an opening, GL replay starts at zero and includes
pre-period cash activity, while period movement still counts only in-period
lines. The opening remains null. Bank ending is relative period movement and
bank_vs_gl_ok remains null with the note `absolute bank ending unknown without opening`.
A supplied closing mismatch adds `closing_mismatch` without changing the arithmetic identity.

Non-void lines replay in `(txn_date, created_at, entry.id, line.id)` order;
future lines are excluded. Snapshots are end-of-day values for period start,
period end, and each cash movement date, for all configured cash accounts and
`__CASH_TOTAL__`. A start-day movement therefore updates the start snapshot after
the supplied opening. Unused cash accounts are included. Multiple cash accounts
receive no invented opening allocation: only the virtual total is seeded.

Replay replaces this job's balance rows and JSON, and changes ingested status to
replayed. The file is staged and atomically replaced; caught database failures
roll back rows and restore the previous JSON. A filesystem and SQLite are not a
single crash-atomic transaction: rerun replay after an abrupt process interruption.
Use a dedicated session because replay flushes and commits pending edits.
No findings, matches, or later-day outputs are created by replay.
