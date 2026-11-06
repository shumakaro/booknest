"""Добавление языка, мягкого удаления и обратимое разделение имени."""

from alembic import op
import sqlalchemy as sa

revision = "002_profile_names"
down_revision = "001_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("books", sa.Column("language", sa.String(30), nullable=False, server_default="ru"))
    op.add_column("books", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("profiles", "full_name", new_column_name="first_name")
    op.add_column("profiles", sa.Column("last_name", sa.Text(), nullable=True))
    # Наличие первого пробела сохраняется через NULL: даже двойные и конечные пробелы обратимы.
    op.execute(
        "UPDATE profiles SET last_name=substring(first_name from position(' ' in first_name)+1), first_name=substring(first_name for position(' ' in first_name)-1) WHERE position(' ' in first_name)>0"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE profiles SET first_name=first_name || CASE WHEN last_name IS NULL THEN '' ELSE ' ' || last_name END"
    )
    op.drop_column("profiles", "last_name")
    op.alter_column("profiles", "first_name", new_column_name="full_name")
    op.drop_column("books", "deleted_at")
    op.drop_column("books", "language")
