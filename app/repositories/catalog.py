"""SQL находится в репозитории; пагинация выполняется самой PostgreSQL."""

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from app.models import Author, Book, Genre, Loan, User


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def active_count(self):
        # Коррелированный подзапрос не умножает число выдач при нескольких жанрах.
        return (
            select(func.count(Loan.id))
            .where(Loan.book_id == Book.id, Loan.returned_at.is_(None))
            .correlate(Book)
            .scalar_subquery()
        )

    def book_query(self):
        return (
            select(Book, (Book.total_copies - self.active_count()).label("available"))
            .where(Book.deleted_at.is_(None))
            .options(selectinload(Book.author), selectinload(Book.genres))
        )

    def book_dict(self, book: Book, available: int) -> dict:
        codes = sorted(genre.code for genre in book.genres)
        return {
            "id": book.id,
            "title": book.title,
            "author_id": book.author_id,
            "author": book.author.name,
            "year": book.year,
            "isbn": book.isbn,
            "total_copies": book.total_copies,
            "genre": codes[0] if codes else "fiction",
            "description": book.description,
            "available": available,
        }

    def list_books(
        self,
        *,
        page: int,
        size: int,
        q: str = "",
        genre: str | None = None,
        available_only: bool = False,
        sort: str = "title",
        author_id: int | None = None,
        search_mode: str = "contains",
    ) -> dict:
        stmt = self.book_query()
        if q:
            if search_mode == "fulltext":
                stmt = stmt.where(
                    func.to_tsvector("simple", Book.title).op("@@")(func.plainto_tsquery("simple", q))
                )
            else:
                # autoescape сохраняет буквальный смысл % и _ в пользовательском поиске.
                stmt = stmt.where(Book.title.icontains(q, autoescape=True))
        if genre:
            stmt = stmt.where(Book.genres.any(Genre.code == genre))
        if available_only:
            stmt = stmt.where(Book.total_copies - self.active_count() > 0)
        if author_id is not None:
            stmt = stmt.where(Book.author_id == author_id)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        for field in sort.split(","):
            column = getattr(Book, field.removeprefix("-"))
            stmt = stmt.order_by(column.desc() if field.startswith("-") else column.asc())
        stmt = stmt.order_by(Book.id).offset((page - 1) * size).limit(size)
        items = [self.book_dict(book, available) for book, available in self.db.execute(stmt).all()]
        return {"items": items, "total": total, "page": page, "size": size}

    def get_book(self, item_id: int, lock: bool = False) -> Book | None:
        stmt = (
            select(Book)
            .where(Book.id == item_id, Book.deleted_at.is_(None))
            .options(selectinload(Book.author), selectinload(Book.genres))
        )
        if lock:
            stmt = stmt.with_for_update()
        return self.db.scalar(stmt)

    def read_book(self, item_id: int) -> dict | None:
        row = self.db.execute(self.book_query().where(Book.id == item_id)).first()
        return self.book_dict(row[0], row[1]) if row else None

    def get_author(self, item_id: int) -> Author | None:
        return self.db.get(Author, item_id)

    def author_dict(self, author: Author) -> dict:
        return {"id": author.id, "name": author.name, "birth_year": author.birth_year}

    def list_authors(self, page: int, size: int, q: str = "") -> dict:
        condition = Author.name.icontains(q, autoescape=True)
        total = self.db.scalar(select(func.count()).select_from(Author).where(condition))
        authors = self.db.scalars(
            select(Author).where(condition).order_by(Author.id).offset((page - 1) * size).limit(size)
        )
        return {
            "items": [self.author_dict(author) for author in authors],
            "total": total,
            "page": page,
            "size": size,
        }

    def genre(self, code: str) -> Genre:
        genre = self.db.scalar(select(Genre).where(Genre.code == code))
        if genre is None:
            genre = Genre(code=code, name=code)
            self.db.add(genre)
            self.db.flush()
        return genre

    def create(self, resource: str, data: dict):
        if resource == "books":
            values = data.copy()
            genre = self.genre(values.pop("genre"))
            item = Book(**values, genres=[genre])
        else:
            item = Author(**data)
        self.db.add(item)
        self.db.flush()
        return item

    def update(self, resource: str, item, data: dict) -> None:
        values = data.copy()
        if resource == "books" and "genre" in values:
            item.genres = [self.genre(values.pop("genre"))]
        for field, value in values.items():
            setattr(item, field, value)
        self.db.flush()

    def delete(self, resource: str, item) -> None:
        if resource == "books":
            item.deleted_at = datetime.now(timezone.utc)
        else:
            self.db.delete(item)
        self.db.flush()

    def active_loans(self, book_id: int) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Loan).where(Loan.book_id == book_id, Loan.returned_at.is_(None))
        )

    def has_author_books(self, author_id: int) -> bool:
        # Даже мягко удалённая книга сохраняет историческую связь с автором.
        return self.db.scalar(select(Book.id).where(Book.author_id == author_id).limit(1)) is not None


class LoanRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, item_id: int, lock: bool = False) -> Loan | None:
        stmt = select(Loan).where(Loan.id == item_id)
        if lock:
            stmt = stmt.with_for_update()
        return self.db.scalar(stmt)

    def user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def active_for_user(self, book_id: int, user_id: int) -> bool:
        return (
            self.db.scalar(
                select(Loan.id).where(
                    Loan.book_id == book_id, Loan.user_id == user_id, Loan.returned_at.is_(None)
                )
            )
            is not None
        )

    def create(self, book_id: int, user_id: int, due_date) -> Loan:
        loan = Loan(book_id=book_id, user_id=user_id, due_date=due_date)
        self.db.add(loan)
        self.db.flush()
        return loan

    def list(self, user_id: int | None, page: int, size: int) -> dict:
        stmt = select(Loan)
        if user_id is not None:
            stmt = stmt.where(Loan.user_id == user_id)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        items = list(self.db.scalars(stmt.order_by(Loan.id).offset((page - 1) * size).limit(size)))
        return {"items": items, "total": total, "page": page, "size": size}
