# LedgerTrace V1 — Day 2

This checkout stops at the Day 2 database foundation. The Day 1 money type and `/health` endpoint are retained. No ingestion, replay engine, detectors, job API routes, or UI are implemented here.

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

Next: Day 3 CSV ingest.
