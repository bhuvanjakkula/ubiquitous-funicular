"""Day 2 normalized schema: integer cents, Date dates, naive UTC timestamps.

Deletion is owned by SQLite ON DELETE CASCADE. passive_deletes='all'
prevents the ORM from nulling loaded child foreign keys during deletion.
"""
from datetime import date, datetime
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, UniqueConstraint, false, true, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, utcnow


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(primary_key=True)
    entity_name: Mapped[str]
    currency: Mapped[str] = mapped_column(default="USD", server_default="USD")
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    period_close_date: Mapped[date | None] = mapped_column(Date)
    expected_opening_cash_cents: Mapped[int | None] = mapped_column(Integer)
    expected_closing_cash_cents: Mapped[int | None] = mapped_column(Integer)
    cash_account_ids_json: Mapped[str]
    status: Mapped[str]
    input_bank_sha256: Mapped[str | None]
    input_gl_sha256: Mapped[str | None]
    software_version: Mapped[str]
    error: Mapped[str | None]

    bank_lines: Mapped[list["BankLine"]] = relationship(back_populates="job", passive_deletes="all")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(back_populates="job", passive_deletes="all")
    journal_lines: Mapped[list["JournalLine"]] = relationship(back_populates="job", passive_deletes="all")
    recon_events: Mapped[list["ReconEvent"]] = relationship(back_populates="job", passive_deletes="all")
    edit_events: Mapped[list["EditEvent"]] = relationship(back_populates="job", passive_deletes="all")
    replay_balances: Mapped[list["ReplayBalance"]] = relationship(back_populates="job", passive_deletes="all")
    matches: Mapped[list["Match"]] = relationship(back_populates="job", passive_deletes="all")
    findings: Mapped[list["Finding"]] = relationship(back_populates="job", passive_deletes="all")
    evidence_packs: Mapped[list["EvidencePack"]] = relationship(back_populates="job", passive_deletes="all")
    __table_args__ = (
        CheckConstraint("status IN ('queued','ingested','replayed','detected','failed')", name="ck_jobs_status"),
        CheckConstraint("period_end >= period_start", name="ck_jobs_period"),
    )


class BankLine(Base):
    __tablename__ = "bank_lines"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    source_id: Mapped[str]
    posted_date: Mapped[date] = mapped_column(Date)
    value_date: Mapped[date | None] = mapped_column(Date)
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str]
    description: Mapped[str]
    account_ref: Mapped[str | None]
    fitid: Mapped[str | None]
    type: Mapped[str] = mapped_column(default="OTHER", server_default="OTHER")
    check_number: Mapped[str | None]
    file_row: Mapped[int]
    job: Mapped[Job] = relationship(back_populates="bank_lines")
    __table_args__ = (
        UniqueConstraint("job_id", "source_id", name="uq_bank_lines_source"),
        Index("ix_bank_lines_job_posted", "job_id", "posted_date"),
    )


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    source_journal_id: Mapped[str]
    txn_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    created_by: Mapped[str | None]
    modified_by: Mapped[str | None]
    source: Mapped[str] = mapped_column(default="UNKNOWN", server_default="UNKNOWN")
    memo: Mapped[str | None]
    is_void: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    reverses_id: Mapped[str | None]
    file_row_first: Mapped[int]
    job: Mapped[Job] = relationship(back_populates="journal_entries")
    lines: Mapped[list["JournalLine"]] = relationship(back_populates="entry", passive_deletes="all")
    __table_args__ = (
        UniqueConstraint("job_id", "source_journal_id", name="uq_journal_entries_source"),
        Index("ix_journal_entries_job_txn", "job_id", "txn_date"),
    )


class JournalLine(Base):
    __tablename__ = "journal_lines"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    entry_id: Mapped[str] = mapped_column(ForeignKey("journal_entries.id", ondelete="CASCADE"))
    source_line_id: Mapped[str]
    account_id: Mapped[str]
    account_name: Mapped[str | None]
    debit_cents: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    credit_cents: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    cleared_flag: Mapped[bool | None] = mapped_column(Boolean)
    cleared_date: Mapped[date | None] = mapped_column(Date)
    recon_id: Mapped[str | None]
    file_row: Mapped[int]
    job: Mapped[Job] = relationship(back_populates="journal_lines")
    entry: Mapped[JournalEntry] = relationship(back_populates="lines")
    __table_args__ = (
        CheckConstraint("debit_cents >= 0", name="ck_journal_lines_debit"),
        CheckConstraint("credit_cents >= 0", name="ck_journal_lines_credit"),
        CheckConstraint("NOT (debit_cents > 0 AND credit_cents > 0)", name="ck_journal_lines_one_side"),
        UniqueConstraint("job_id", "source_line_id", name="uq_journal_lines_source"),
        Index("ix_journal_lines_job_account", "job_id", "account_id"),
        Index("ix_journal_lines_job_cleared", "job_id", "cleared_date"),
    )


class ReconEvent(Base):
    __tablename__ = "recon_events"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    journal_line_id: Mapped[str] = mapped_column(ForeignKey("journal_lines.id", ondelete="CASCADE"))
    event_type: Mapped[str]
    event_date: Mapped[date] = mapped_column(Date)
    recon_id: Mapped[str | None]
    job: Mapped[Job] = relationship(back_populates="recon_events")
    __table_args__ = (CheckConstraint("event_type IN ('cleared','uncleared','recon_locked')", name="ck_recon_events_type"),)


class EditEvent(Base):
    __tablename__ = "edit_events"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    subject_type: Mapped[str]
    subject_id: Mapped[str]
    modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    modified_by: Mapped[str | None]
    inferred: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    job: Mapped[Job] = relationship(back_populates="edit_events")
    __table_args__ = (CheckConstraint("subject_type IN ('journal_entry','journal_line')", name="ck_edit_events_subject"),)


class ReplayBalance(Base):
    __tablename__ = "replay_balances"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    account_id: Mapped[str]
    as_of_date: Mapped[date] = mapped_column(Date)
    balance_cents: Mapped[int] = mapped_column(Integer)
    job: Mapped[Job] = relationship(back_populates="replay_balances")
    __table_args__ = (
        UniqueConstraint("job_id", "account_id", "as_of_date", name="uq_replay_balances_snapshot"),
        Index("ix_replay_balances_job_date", "job_id", "as_of_date"),
    )


class Match(Base):
    __tablename__ = "matches"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    bank_line_id: Mapped[str] = mapped_column(ForeignKey("bank_lines.id", ondelete="CASCADE"))
    journal_line_id: Mapped[str] = mapped_column(ForeignKey("journal_lines.id", ondelete="CASCADE"))
    method: Mapped[str]
    confidence: Mapped[int] = mapped_column(Integer)
    job: Mapped[Job] = relationship(back_populates="matches")
    __table_args__ = (
        UniqueConstraint("job_id", "bank_line_id", "journal_line_id", name="uq_matches_pair"),
        CheckConstraint("confidence >= 0 AND confidence <= 100", name="ck_matches_confidence"),
        CheckConstraint("method IN ('exact_amount_date','amount_date_desc','manual')", name="ck_matches_method"),
    )


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    detector_id: Mapped[str]
    severity: Mapped[str]
    title: Mapped[str]
    amount_cents: Mapped[int | None] = mapped_column(Integer)
    cite_bank_ids_json: Mapped[str] = mapped_column(default="[]", server_default="[]")
    cite_line_ids_json: Mapped[str] = mapped_column(default="[]", server_default="[]")
    cite_entry_ids_json: Mapped[str] = mapped_column(default="[]", server_default="[]")
    payload_json: Mapped[str] = mapped_column(default="{}", server_default="{}")
    job: Mapped[Job] = relationship(back_populates="findings")
    __table_args__ = (
        CheckConstraint("severity IN ('FAIL','UNKNOWN','INFO')", name="ck_findings_severity"),
        Index("ix_findings_job_detector", "job_id", "detector_id"),
    )


class EvidencePack(Base):
    __tablename__ = "evidence_packs"
    id: Mapped[str] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    json_path: Mapped[str]
    pdf_path: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    job: Mapped[Job] = relationship(back_populates="evidence_packs")
