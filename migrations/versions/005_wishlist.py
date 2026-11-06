"""Постоянный персональный список желаемого, без изменения прежних таблиц."""

from alembic import op
import sqlalchemy as sa

revision = "005_wishlist"
down_revision = "004_book_form_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wishlist_entries",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("book_id", sa.Integer(), sa.ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("wishlist_entries")
