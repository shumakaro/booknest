"""Расширения для отзыва токенов и аудита, без изменения имеющихся данных."""

from alembic import op
import sqlalchemy as sa

revision = "003_auth"
down_revision = "002_profile_names"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.create_table(
        "denied_tokens",
        sa.Column("digest", sa.String(64), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("denied_tokens")
    op.drop_column("users", "email_verified")
