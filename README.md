# LedgerTrace

Local historical-ledger debugger for accountants.

Reconstructs cash as-of a period, matches bank lines to cash GL lines,
and writes an unposted integrity workpaper.

## What it is

- Deterministic detectors; no LLM in the check path.
- Findings cite source row IDs.
- `evidence.json` and `evidence.pdf` for professional review.
- Data stays in local SQLite and `data/jobs/`. Local only.

## What it is not

- Not a general ledger. Does not post, void, or sync to QuickBooks, Xero, NetSuite, or banks.
- Does not certify GAAP, IFRS, or SOX. Not a compliance certificate.
- Not a close-management product such as FloQast or BlackLine.

## Disclaimer

> LedgerTrace reconstructs historical ledger states, identifies the
> transaction sequence that caused a financial discrepancy, and flags
> integrity failures for professional review. It does not post to the
> general ledger and does not certify GAAP, IFRS, or SOX compliance.

## Requirements

Python 3.12, SQLite, and Node 20+ only if you run the UI.

## Setup

```sh
python -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[test]"
python -c "from pathlib import Path; Path('data').mkdir(exist_ok=True)"
alembic upgrade head
pytest -q
```

The API can also create V1 tables at startup. Set `LEDGERTRACE_DATABASE_URL`
to override `sqlite:///data/ledgertrace.db`; set `LEDGERTRACE_DATA_DIR` to
move local job artifacts. No schema was changed without a migration.

## Run API

```sh
uvicorn ledgertrace.api.main:app --host 127.0.0.1 --port 8000
curl -s http://127.0.0.1:8000/health
```

Bind local only. There is no auth or public hosting. Upload CSVs with
`POST /api/jobs`; GET job status, `/findings`, `/matches`, `/rollforward`,
`/evidence.json`, and `/evidence.pdf` beneath `/api/jobs/{id}`.
Config accepts a file part named `config` or `job`, or a raw JSON `config` field.
Create ingests only. Run executes the pipeline. No PUT/DELETE endpoints exist.
Errors use `detail.error` and `detail.code`: INGEST_ERROR, NOT_FOUND, NOT_READY,
or FAILED_JOB. Missing artifacts return 404; run-before-ready conditions return
409. A failed job cannot run.

## Demo - happy path

Expected: 0 FAIL, 3 matches, ending $1,250.00.

```sh
curl -s -F bank=@tests/fixtures/happy/bank.csv \
        -F gl=@tests/fixtures/happy/gl.csv \
        -F config=@tests/fixtures/happy/job.json \
        http://127.0.0.1:8000/api/jobs
# Replace JOB_ID with the returned job_id.
curl -s -X POST http://127.0.0.1:8000/api/jobs/JOB_ID/run
curl -O http://127.0.0.1:8000/api/jobs/JOB_ID/evidence.pdf
```

On Windows use `curl.exe` if the shell aliases curl. Python equivalent:

```python
from ledgertrace.db.session import SessionLocal
from ledgertrace.ingest.service import ingest_job
from ledgertrace.ingest.job_config import load_job_config
from ledgertrace.detect.run_all import run_all

with SessionLocal() as session:
    job = ingest_job(session, "tests/fixtures/happy/bank.csv",
                     "tests/fixtures/happy/gl.csv",
                     load_job_config("tests/fixtures/happy/job.json"))
    result = run_all(session, job.id)
    print(result)
```

Offline, `python scripts/demo_happy.py` uses temporary SQLite and retains local
artifacts under `data/demo/jobs/`. It starts no server and needs no network.

## Demo - d4 unmatched

Use the same upload commands with `d4_unmatched`:

- `unmatched_bank`: -12345 cents (Mystery bank fee).
- `unmatched_gl`: 20000 cents.
- `beginning_balance_break`: bank_vs_gl discrepancy.
- GL ending 145000, bank ending 112655, identity_ok true.

## Demo - d1 opening break

Use `d1_opening_break`: claimed opening 100000 versus pre-period books 40000,
delta 60000. Replay uses the claim and still ends at 125000.

## UI

```sh
cd web
npm install
npm run dev
```

Open http://127.0.0.1:5173 with the API already on port 8000.
Three screens only: Upload, Findings, Evidence. `VITE_API_BASE` defaults to
http://127.0.0.1:8000. CORS permits only the two local port-5173 origins.
Build with `npm run build`; lightweight preview/form checks use `npm test`.

Manual QA:

1. Start the API and UI with the commands above.
2. Upload happy bank/GL files, opening 100000, period 2025, close 2026-01-15.
3. Create and run: Findings ending $1,250.00, matches 3, FAIL 0.
4. Create d4_unmatched: inspect unmatched_bank and unmatched_gl citations.
5. Open Evidence: JSON opens; PDF downloads and begins with `%PDF`.

## Detectors shipped

| ID | FAIL when |
| --- | --- |
| beginning_balance_break | Claimed opening disagrees with pre-period cash books, claimed closing disagrees, or bank versus GL roll-forward diverges |
| edited_after_clear | Cleared line modified after cleared_date, on a different date from creation |
| duplicate_event | Same-signature bank or cash GL cluster; reversals excluded |
| unmatched_bank / unmatched_gl | No 1:1 period cash match |
| period_mutation | Entry dated on or before period_end created or modified after close |
| unbalanced_entry | Ingest-time journal does not balance |

UNKNOWN when required evidence is unavailable, including missing opening/close
dates or timestamp columns. `gl_columns.json` records actual alias-mapped headers;
defaulted timestamps do not mean a column existed. D5 runs whichever timestamp
check is available and returns UNKNOWN when both columns are absent. D1 uses
`opening_basis`: no pre-period cash evidence means claimed mode, not a false
opening failure. D3 uses signed amount/date/normalized description, plus account
for cash GL. Opposite nonzero amounts within three days and a reversal memo or
explicit reversal link are paired one-to-one before clustering. GL splits within
one journal do not alone constitute a duplicate. Matches are proposals only.

## Money and dates

Integer cents only. `expected_opening_cash_cents` is cash at period_start before
that day's lines; pre-period cash is not added on top of the claim. Without a
claim, replay is relative and bank-versus-GL comparison is unknown. CSV schemas
remain fixed; extend alias maps for differing exports, not normalized columns.
The UI formats cents for display and does not calculate detector results.

## Evidence

`data/jobs/{job_id}/evidence.json` and `data/jobs/{job_id}/evidence.pdf` include
input hashes, roll-forward, cited findings, and human review actions.
Footer: **UNPOSTED WORKPAPER - FOR REVIEW ONLY**.
All earlier runner names alias `run_all`. It preserves ingest findings and
replaces integrity findings and matches on rerun. Totals and per-detector counts
are returned. PDF/JSON are replaced atomically per file; handled failures restore
prior artifacts and roll back detection. Replay is a separate committed
checkpoint. Use one writer per job; this is not crash-atomic across SQLite and
the filesystem. Professional review is required, even with zero FAILs.

## Tests

```sh
pytest -q
```

Fixtures: happy (Days 3-5), unbalanced_je and alias_headers (Days 3-4),
d4_unmatched (Days 4/7), d1_opening_break (Days 6/7), d2_edited_after_clear,
d5_after_close and no_timestamps (Day 8), d3_duplicate (Day 9).
Tests cover every detector fixture, JSON/PDF hashes and disclaimer, API routes,
repeat runs, and rollback. No new detectors are part of this freeze.

## License / liability

Professional review required. Authors are not the user's CPA.
No separate license grant is implied by this README. See DISCLAIMER.md and
SCOPE.md for the product boundaries. V1 is frozen; do not build V2 speculatively.


## V2.1 - statement ending and conditional draft journals

V2.1 is a separately authorized extension to the frozen V1 baseline. It remains
local-only, with no QBO/Xero API, posting, or GAAP/IFRS rule packs.

Before starting the updated API against an existing V1 database, stop the API
and run `alembic upgrade head`. Revision `0003` follows `0001` and adds only
`jobs.expected_bank_statement_ending_cents` (nullable integer) and
`jobs.export_dialect` (generic by default, restricted to generic/qbo/xero).
Existing job and child rows are preserved. If V1 tables were created by the API
and have no Alembic version, first verify they match revision 0001, back up the
SQLite file, and use `alembic stamp 0001` before upgrading. Do not stamp an
unknown schema. `create_all` creates a fresh database
but cannot upgrade an existing one. For a custom database, set sqlalchemy.url
in your Alembic configuration to the same database used by the API.

Job JSON and the upload form accept:

```json
{"export_dialect": "generic", "expected_bank_statement_ending_cents": 120000}
```

These keys supplement the usual required job fields. `export_dialect` may be
`generic`, `qbo`, or `xero`; unknown values are rejected. Dialect-specific aliases
are unioned into independent copies of the generic maps. Reconcile marks R, C,
Y, and the check mark are true. This handles CSV exports only, not live product
integrations. Canonical headers still take precedence. Missing edit columns
retain the V1 UNKNOWN behavior; the dialect fixtures have zero FAILs, not
necessarily zero UNKNOWNs.

`statement_ending_break` silently skips an absent/null statement claim. With a
claim, it compares against the absolute bank roll-forward and flags the absolute
difference. With no opening cash, it returns UNKNOWN because V1's stored bank
ending is relative. V1 replay math is unchanged. The statement fixture claims
120000 against bank/GL ending 125000 and produces a 5000-cent FAIL.

Evidence JSON now contains `proposed_draft_jes` and `draft_disclaimer`. PDF ends
with a draft-journal section when drafts exist. Every draft has status
`DRAFT_NOT_POSTED`. Opening suggestions are explicitly conditional on the claim
being correct, not a command to force the books to it. Statement ties produce
cash/suspense suggestions only when bank and GL already agree; otherwise two
inspect-only notes require reconciliation first. Unmatched bank suggestions use
suspense; unmatched cash GL yields inspect-only with no lines, never a second
posting. Journal suggestions balance in integer cents. Cash defaults to the first
configured cash account and requires human confirmation; no allocation is inferred.

V1 fixture amounts remain unchanged. Happy still has zero FAILs and no drafts.
Run `pytest tests/test_v2_1.py -q` and `pytest -q`. No V2.2 work is included.
