"""Добавляет происхождение и обложку, сохраняя существующие книги и связи."""
from alembic import op
import sqlalchemy as sa

revision = "006_external_books"
down_revision = "005_wishlist"
branch_labels = None
depends_on = None


def upgrade():
    # Nullable-поля позволяют старой версии приложения продолжать читать прежние строки.
    op.add_column("books", sa.Column("external_work_id", sa.String(30), nullable=True))
    op.add_column("books", sa.Column("cover_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("books_external_work_id_key", "books", ["external_work_id"])
    op.create_check_constraint("books_external_work_id_ck", "books", "external_work_id IS NULL OR external_work_id ~ '^OL[0-9]+W$'")
    op.create_check_constraint("books_cover_id_ck", "books", "cover_id IS NULL OR cover_id > 0")


def downgrade():
    # Откат схемы не удаляет сами книги, но лишает их привязки к внешнему источнику.
    op.drop_constraint("books_cover_id_ck", "books", type_="check")
    op.drop_constraint("books_external_work_id_ck", "books", type_="check")
    op.drop_constraint("books_external_work_id_key", "books", type_="unique")
    op.drop_column("books", "cover_id")
    op.drop_column("books", "external_work_id")
