"""Day 2 schema, reviewed against models for checks, uniqueness and CASCADE.

Frozen explicit DDL: this revision does not import mutable model metadata.
Downgrade removes children before their parent tables.
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('jobs',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('entity_name', sa.Text(), nullable=False),
    sa.Column('currency', sa.Text(), server_default='USD', nullable=False),
    sa.Column('period_start', sa.Date(), nullable=False),
    sa.Column('period_end', sa.Date(), nullable=False),
    sa.Column('period_close_date', sa.Date(), nullable=True),
    sa.Column('expected_opening_cash_cents', sa.Integer(), nullable=True),
    sa.Column('expected_closing_cash_cents', sa.Integer(), nullable=True),
    sa.Column('cash_account_ids_json', sa.Text(), nullable=False),
    sa.Column('status', sa.Text(), nullable=False),
    sa.Column('input_bank_sha256', sa.Text(), nullable=True),
    sa.Column('input_gl_sha256', sa.Text(), nullable=True),
    sa.Column('software_version', sa.Text(), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint("status IN ('queued','ingested','replayed','detected','failed')", name='ck_jobs_status'),
    sa.CheckConstraint('period_end >= period_start', name='ck_jobs_period'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('bank_lines',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('source_id', sa.Text(), nullable=False),
    sa.Column('posted_date', sa.Date(), nullable=False),
    sa.Column('value_date', sa.Date(), nullable=True),
    sa.Column('amount_cents', sa.Integer(), nullable=False),
    sa.Column('currency', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('account_ref', sa.Text(), nullable=True),
    sa.Column('fitid', sa.Text(), nullable=True),
    sa.Column('type', sa.Text(), server_default='OTHER', nullable=False),
    sa.Column('check_number', sa.Text(), nullable=True),
    sa.Column('file_row', sa.Integer(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'source_id', name='uq_bank_lines_source')
    )
    with op.batch_alter_table('bank_lines', schema=None) as batch_op:
        batch_op.create_index('ix_bank_lines_job_posted', ['job_id', 'posted_date'], unique=False)

    op.create_table('edit_events',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('subject_type', sa.Text(), nullable=False),
    sa.Column('subject_id', sa.Text(), nullable=False),
    sa.Column('modified_at', sa.DateTime(), nullable=False),
    sa.Column('modified_by', sa.Text(), nullable=True),
    sa.Column('inferred', sa.Boolean(), server_default=sa.text('1'), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint("subject_type IN ('journal_entry','journal_line')", name='ck_edit_events_subject'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('evidence_packs',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('json_path', sa.Text(), nullable=False),
    sa.Column('pdf_path', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('findings',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('detector_id', sa.Text(), nullable=False),
    sa.Column('severity', sa.Text(), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('amount_cents', sa.Integer(), nullable=True),
    sa.Column('cite_bank_ids_json', sa.Text(), server_default='[]', nullable=False),
    sa.Column('cite_line_ids_json', sa.Text(), server_default='[]', nullable=False),
    sa.Column('cite_entry_ids_json', sa.Text(), server_default='[]', nullable=False),
    sa.Column('payload_json', sa.Text(), server_default='{}', nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint("severity IN ('FAIL','UNKNOWN','INFO')", name='ck_findings_severity'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('findings', schema=None) as batch_op:
        batch_op.create_index('ix_findings_job_detector', ['job_id', 'detector_id'], unique=False)

    op.create_table('journal_entries',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('source_journal_id', sa.Text(), nullable=False),
    sa.Column('txn_date', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('modified_at', sa.DateTime(), nullable=False),
    sa.Column('created_by', sa.Text(), nullable=True),
    sa.Column('modified_by', sa.Text(), nullable=True),
    sa.Column('source', sa.Text(), server_default='UNKNOWN', nullable=False),
    sa.Column('memo', sa.Text(), nullable=True),
    sa.Column('is_void', sa.Boolean(), server_default=sa.text('0'), nullable=False),
    sa.Column('reverses_id', sa.Text(), nullable=True),
    sa.Column('file_row_first', sa.Integer(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'source_journal_id', name='uq_journal_entries_source')
    )
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.create_index('ix_journal_entries_job_txn', ['job_id', 'txn_date'], unique=False)

    op.create_table('replay_balances',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('account_id', sa.Text(), nullable=False),
    sa.Column('as_of_date', sa.Date(), nullable=False),
    sa.Column('balance_cents', sa.Integer(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'account_id', 'as_of_date', name='uq_replay_balances_snapshot')
    )
    with op.batch_alter_table('replay_balances', schema=None) as batch_op:
        batch_op.create_index('ix_replay_balances_job_date', ['job_id', 'as_of_date'], unique=False)

    op.create_table('journal_lines',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('entry_id', sa.Text(), nullable=False),
    sa.Column('source_line_id', sa.Text(), nullable=False),
    sa.Column('account_id', sa.Text(), nullable=False),
    sa.Column('account_name', sa.Text(), nullable=True),
    sa.Column('debit_cents', sa.Integer(), server_default='0', nullable=False),
    sa.Column('credit_cents', sa.Integer(), server_default='0', nullable=False),
    sa.Column('cleared_flag', sa.Boolean(), nullable=True),
    sa.Column('cleared_date', sa.Date(), nullable=True),
    sa.Column('recon_id', sa.Text(), nullable=True),
    sa.Column('file_row', sa.Integer(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('NOT (debit_cents > 0 AND credit_cents > 0)', name='ck_journal_lines_one_side'),
    sa.CheckConstraint('credit_cents >= 0', name='ck_journal_lines_credit'),
    sa.CheckConstraint('debit_cents >= 0', name='ck_journal_lines_debit'),
    sa.ForeignKeyConstraint(['entry_id'], ['journal_entries.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'source_line_id', name='uq_journal_lines_source')
    )
    with op.batch_alter_table('journal_lines', schema=None) as batch_op:
        batch_op.create_index('ix_journal_lines_job_account', ['job_id', 'account_id'], unique=False)
        batch_op.create_index('ix_journal_lines_job_cleared', ['job_id', 'cleared_date'], unique=False)

    op.create_table('matches',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('bank_line_id', sa.Text(), nullable=False),
    sa.Column('journal_line_id', sa.Text(), nullable=False),
    sa.Column('method', sa.Text(), nullable=False),
    sa.Column('confidence', sa.Integer(), nullable=False),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint("method IN ('exact_amount_date','amount_date_desc','manual')", name='ck_matches_method'),
    sa.CheckConstraint('confidence >= 0 AND confidence <= 100', name='ck_matches_confidence'),
    sa.ForeignKeyConstraint(['bank_line_id'], ['bank_lines.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['journal_line_id'], ['journal_lines.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'bank_line_id', 'journal_line_id', name='uq_matches_pair')
    )
    op.create_table('recon_events',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('job_id', sa.Text(), nullable=False),
    sa.Column('journal_line_id', sa.Text(), nullable=False),
    sa.Column('event_type', sa.Text(), nullable=False),
    sa.Column('event_date', sa.Date(), nullable=False),
    sa.Column('recon_id', sa.Text(), nullable=True),
    sa.Column('created_in_system_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint("event_type IN ('cleared','uncleared','recon_locked')", name='ck_recon_events_type'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['journal_line_id'], ['journal_lines.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('recon_events')
    op.drop_table('matches')
    with op.batch_alter_table('journal_lines', schema=None) as batch_op:
        batch_op.drop_index('ix_journal_lines_job_cleared')
        batch_op.drop_index('ix_journal_lines_job_account')

    op.drop_table('journal_lines')
    with op.batch_alter_table('replay_balances', schema=None) as batch_op:
        batch_op.drop_index('ix_replay_balances_job_date')

    op.drop_table('replay_balances')
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.drop_index('ix_journal_entries_job_txn')

    op.drop_table('journal_entries')
    with op.batch_alter_table('findings', schema=None) as batch_op:
        batch_op.drop_index('ix_findings_job_detector')

    op.drop_table('findings')
    op.drop_table('evidence_packs')
    op.drop_table('edit_events')
    with op.batch_alter_table('bank_lines', schema=None) as batch_op:
        batch_op.drop_index('ix_bank_lines_job_posted')

    op.drop_table('bank_lines')
    op.drop_table('jobs')
