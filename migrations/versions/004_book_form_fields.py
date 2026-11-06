"""Сохраняет поля существующей React-формы в PostgreSQL без выдуманных значений при редактировании."""

from alembic import op
import sqlalchemy as sa

revision = "004_book_form_fields"
down_revision = "003_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "books", sa.Column("publisher", sa.String(100), nullable=False, server_default="Не указано")
    )
    op.add_column("books", sa.Column("edition_year", sa.Integer(), nullable=True))
    op.execute("UPDATE books SET edition_year=year WHERE edition_year IS NULL")
    op.alter_column("books", "edition_year", nullable=False)
    op.add_column("books", sa.Column("pages", sa.Integer(), nullable=False, server_default="1"))
    op.create_check_constraint("books_edition_ck", "books", "edition_year BETWEEN year AND 2100")
    op.create_check_constraint("books_pages_ck", "books", "pages BETWEEN 1 AND 10000")


def downgrade() -> None:
    op.drop_constraint("books_pages_ck", "books", type_="check")
    op.drop_constraint("books_edition_ck", "books", type_="check")
    op.drop_column("books", "pages")
    op.drop_column("books", "edition_year")
    op.drop_column("books", "publisher")
