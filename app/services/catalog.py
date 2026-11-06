"""Сервис проверяет правила предметной области и завершает транзакции."""

from datetime import date
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.repositories.catalog import CatalogRepository, LoanRepository


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CatalogRepository(db)

    def get(self, resource: str, item_id: int, lock: bool = False):
        item = self.repo.get_book(item_id, lock=lock) if resource == "books" else self.repo.get_author(item_id)
        if item is None:
            raise HTTPException(404, "Запись не найдена")
        return item

    def read(self, resource: str, item_id: int) -> dict:
        item = self.get(resource, item_id)
        return self.repo.read_book(item_id) if resource == "books" else self.repo.author_dict(item)

    def save(self, resource: str, data: dict, item_id: int | None = None) -> dict:
        try:
            item = self.get(resource, item_id, lock=True) if item_id is not None else None
            if resource == "books":
                author_id = data.get("author_id")
                if author_id is not None:
                    self.get("authors", author_id)
                if item and "total_copies" in data and data["total_copies"] < self.repo.active_loans(item.id):
                    raise HTTPException(409, "Число экземпляров меньше числа активных выдач")
            if item is None:
                item = self.repo.create(resource, data)
            else:
                self.repo.update(resource, item, data)
            # Изменения одной операции фиксируются один раз, после всех проверок.
            self.db.commit()
            return self.read(resource, item.id)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(409, "Данные конфликтуют с существующей записью") from None

    def delete(self, resource: str, item_id: int) -> None:
        item = self.get(resource, item_id, lock=True)
        if resource == "books" and self.repo.active_loans(item_id):
            raise HTTPException(409, "Сначала необходимо вернуть выданные экземпляры")
        if resource == "authors" and self.repo.has_author_books(item_id):
            raise HTTPException(409, "Нельзя удалить автора, у которого есть книги")
        self.repo.delete(resource, item)
        self.db.commit()


class LoanService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LoanRepository(db)
        self.catalog = CatalogRepository(db)

    def issue(self, book_id: int, user_id: int, due_date: date):
        try:
            # Блокировка строки книги сериализует конкурирующие выдачи последнего экземпляра.
            book = self.catalog.get_book(book_id, lock=True)
            if book is None or self.repo.user(user_id) is None:
                raise HTTPException(404, "Книга или читатель не найдены")
            if self.repo.active_for_user(book_id, user_id):
                raise HTTPException(409, "У читателя уже есть активная выдача этой книги")
            if self.catalog.active_loans(book_id) >= book.total_copies:
                raise HTTPException(409, "Свободных экземпляров нет")
            loan = self.repo.create(book_id, user_id, due_date)
            self.db.commit()
            return loan
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(409, "Конфликт одновременной выдачи") from None

    def return_book(self, loan_id: int):
        loan = self.repo.get(loan_id, lock=True)
        if loan is None:
            raise HTTPException(404, "Выдача не найдена")
        if loan.returned_at is not None:
            raise HTTPException(409, "Книга уже возвращена")
        loan.returned_at = date.today()
        self.db.commit()
        return loan
