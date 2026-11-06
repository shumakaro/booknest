"""SQL персонального списка; владелец всегда передаётся серверной зависимостью."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models import Book, WishlistEntry
from app.repositories.catalog import CatalogRepository


class WishlistRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, user_id: int, page: int, size: int) -> dict:
        catalog = CatalogRepository(self.db)
        stmt = (
            catalog.book_query()
            .join(WishlistEntry, WishlistEntry.book_id == Book.id)
            .where(WishlistEntry.user_id == user_id)
        )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = self.db.execute(stmt.order_by(Book.id).offset((page - 1) * size).limit(size)).all()
        return {
            "items": [catalog.book_dict(book, available) for book, available in rows],
            "total": total,
            "page": page,
            "size": size,
        }

    def add(self, user_id: int, book_id: int) -> None:
        if self.db.get(WishlistEntry, (user_id, book_id)) is None:
            self.db.add(WishlistEntry(user_id=user_id, book_id=book_id))
            self.db.flush()

    def remove(self, user_id: int, book_id: int) -> None:
        entry = self.db.get(WishlistEntry, (user_id, book_id))
        if entry:
            self.db.delete(entry)
            self.db.flush()
