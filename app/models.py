"""Таблицы BookNest соответствуют DDL и последней ревизии Alembic."""

from datetime import date, datetime
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Table,
    Text,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# Составной ключ не разрешает повторить одну и ту же связь книги и жанра.
book_genres = Table(
    "book_genres",
    Base.metadata,
    Column("book_id", ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Author(Base):
    __tablename__ = "authors"
    __table_args__ = (
        CheckConstraint("birth_year BETWEEN 1000 AND 2100", name="authors_birth_year_check"),
        CheckConstraint("length(trim(name)) > 0", name="authors_name_ck"),
    )
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    birth_year: Mapped[int | None]
    books: Mapped[list["Book"]] = relationship(back_populates="author", passive_deletes=True)


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("year BETWEEN 1450 AND 2100", name="books_year_ck"),
        CheckConstraint("total_copies >= 0", name="books_copies_ck"),
        CheckConstraint("edition_year BETWEEN year AND 2100", name="books_edition_ck"),
        CheckConstraint("pages BETWEEN 1 AND 10000", name="books_pages_ck"),
        CheckConstraint("length(trim(title)) > 0", name="books_title_ck"),
        CheckConstraint("isbn IS NULL OR isbn ~ '^[0-9]{13}$'", name="books_isbn_ck"),
        Index("books_author_year_idx", "author_id", "year", "id"),
        Index("books_search_idx", text("to_tsvector('simple',title)"), postgresql_using="gin"),
    )
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="RESTRICT"))
    year: Mapped[int]
    isbn: Mapped[str | None] = mapped_column(String(13), unique=True)
    total_copies: Mapped[int] = mapped_column(server_default="1")
    description: Mapped[str] = mapped_column(Text, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Вторая миграция добавляет язык и мягкое удаление, не теряя старые книги.
    language: Mapped[str] = mapped_column(String(30), server_default="ru")
    publisher: Mapped[str] = mapped_column(String(100), server_default="Не указано")
    edition_year: Mapped[int]
    pages: Mapped[int] = mapped_column(server_default="1")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    author: Mapped[Author] = relationship(back_populates="books")
    genres: Mapped[list["Genre"]] = relationship(secondary=book_genres, back_populates="books")
    loans: Mapped[list["Loan"]] = relationship(back_populates="book", passive_deletes=True)


class Genre(Base):
    __tablename__ = "genres"
    __table_args__ = (
        CheckConstraint("code IN ('scifi','history','poetry','cs','fiction')", name="genres_code_ck"),
    )
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    books: Mapped[list[Book]] = relationship(secondary=book_genres, back_populates="genres")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('member','librarian')", name="users_role_ck"),
        CheckConstraint("position('@' in email) > 1", name="users_email_ck"),
    )
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    profile: Mapped["Profile | None"] = relationship(back_populates="user", passive_deletes=True)
    loans: Mapped[list["Loan"]] = relationship(back_populates="user", passive_deletes=True)


class Profile(Base):
    __tablename__ = "profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    first_name: Mapped[str] = mapped_column(Text)
    last_name: Mapped[str | None] = mapped_column(Text)
    faculty: Mapped[str | None] = mapped_column(Text)
    user: Mapped[User] = relationship(back_populates="profile")


class Loan(Base):
    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint("due_date > issued_at", name="loans_dates_ck"),
        CheckConstraint("returned_at IS NULL OR returned_at >= issued_at", name="loans_return_ck"),
        Index(
            "loans_active_uniq",
            "book_id",
            "user_id",
            unique=True,
            postgresql_where=text("returned_at IS NULL"),
        ),
        Index("loans_due_idx", "due_date", postgresql_where=text("returned_at IS NULL")),
    )
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="RESTRICT"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    issued_at: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    due_date: Mapped[date] = mapped_column(Date)
    returned_at: Mapped[date | None] = mapped_column(Date)
    book: Mapped[Book] = relationship(back_populates="loans")
    user: Mapped[User] = relationship(back_populates="loans")


class DeniedToken(Base):
    """Хранятся только SHA-256 токенов, а не действительные секреты доступа."""

    __tablename__ = "denied_tokens"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AuditEvent(Base):
    """Журнал действий библиотекаря не включает тела запросов или пароли."""

    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    method: Mapped[str] = mapped_column(String(10))
    path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WishlistEntry(Base):
    """Желаемое принадлежит пользователю; пару нельзя добавить дважды."""

    __tablename__ = "wishlist_entries"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), primary_key=True)
