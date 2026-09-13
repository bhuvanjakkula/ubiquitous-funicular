"""V2.1 optional statement ending and CSV dialect; preserve all V1 rows."""
from alembic import op
import sqlalchemy as sa
revision = "0003"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("jobs", sa.Column("expected_bank_statement_ending_cents", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("export_dialect", sa.Text(),
        sa.CheckConstraint("export_dialect IN ('generic','qbo','xero')", name="ck_jobs_export_dialect"),
        nullable=False, server_default="generic"))


def downgrade():
    op.drop_column("jobs", "export_dialect")
    op.drop_column("jobs", "expected_bank_statement_ending_cents")
