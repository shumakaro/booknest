"""Импорт одного произведения без перезаписи пользовательских книг и повторных экземпляров."""
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import Author, Book
from app.repositories.catalog import CatalogRepository
from app.schemas import Genre
from app.services.open_library import OpenLibrary


class ImportBook(BaseModel):
    model_config = ConfigDict(extra="forbid")
    work_id: str = Field(pattern=r"^OL\d+W$", max_length=30)
    # У произведения может не быть года: библиотекарь должен явно указать проверенный год.
    year: int = Field(ge=1450, le=2100)
    total_copies: int = Field(default=1, ge=1, le=10000)
    genre: Genre = "fiction"


def import_book(db: Session, source: OpenLibrary, payload: ImportBook) -> tuple[dict, bool]:
    repo = CatalogRepository(db)
    # Сеть вызывается до взятия блокировок; повтор уже импортированной книги не требует сети.
    existing = db.scalar(select(Book).where(Book.external_work_id == payload.work_id))
    details = None if existing else source.details(payload.work_id)
    # Блокировка транзакции сериализует одновременные импорты одного Work.
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": "booknest:work:" + payload.work_id})
    existing = db.scalar(select(Book).where(Book.external_work_id == payload.work_id))
    if existing:
        if existing.deleted_at:
            raise HTTPException(409, "Эта книга уже есть в архиве. Повторный импорт не восстанавливает ее автоматически.")
        db.commit()
        return repo.read_book(existing.id), False
    if not details or not details.authors:
        raise HTTPException(503, "Не удалось определить автора. Повторите загрузку сведений Open Library.")
    name = " ".join(details.authors[0].split())
    if len(name) > 120 or len(details.title) > 200:
        raise HTTPException(422, "Название или имя автора слишком длинное. Добавьте книгу через обычную форму.")
    # Разные произведения одного нового автора также не должны создавать дубли автора.
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": "booknest:author:" + name.lower()})
    # Обе стороны сравнения нормализует сама БД: локаль PostgreSQL может отличаться от Python.
    author = db.scalar(select(Author).where(func.lower(Author.name) == func.lower(name)))
    if author is None:
        author = Author(name=name)
        db.add(author)
        db.flush()
    matches = db.scalars(select(Book).where(Book.title == details.title, Book.author_id == author.id,
                                           Book.year == payload.year)).all()
    if len(matches) > 1 or (matches and matches[0].deleted_at):
        raise HTTPException(409, "Найдены прежние или архивные записи. Нужна ручная проверка библиотекарем.")
    if matches:
        item = matches[0]
        if item.external_work_id and item.external_work_id != payload.work_id:
            raise HTTPException(409, "Похожая книга связана с другим произведением. Нужна ручная проверка.")
        item.external_work_id = payload.work_id
        if not item.cover_id:
            item.cover_id = details.cover_id
        created = False
    else:
        item = Book(title=details.title, author_id=author.id, year=payload.year, edition_year=payload.year,
                    total_copies=payload.total_copies, description=details.description[:10000],
                    external_work_id=payload.work_id, cover_id=details.cover_id,
                    language="Не указано", genres=[repo.genre(payload.genre)])
        db.add(item)
        created = True
    db.commit()
    return repo.read_book(item.id), created
