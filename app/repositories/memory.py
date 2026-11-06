"""Репозиторий в памяти для лабораторной №7."""

from threading import RLock
from fastapi import HTTPException, Request


class MemoryStore:
    def __init__(self) -> None:
        # Хранилище принадлежит приложению и подменяется в тестах.
        self.books: dict[int, dict] = {}
        self.authors: dict[int, dict] = {}
        self.next_book = 1
        self.next_author = 1
        self.lock = RLock()

    def table(self, resource: str) -> dict[int, dict]:
        return self.books if resource == "books" else self.authors

    def get(self, resource: str, item_id: int) -> dict:
        item = self.table(resource).get(item_id)
        if item is None:
            raise HTTPException(404, "Запись не найдена")
        return item.copy()

    def save(self, resource: str, data: dict, item_id: int | None = None) -> dict:
        # Проверки и запись выполняются вместе, чтобы два запроса не создали дубликат.
        with self.lock:
            if item_id is not None:
                data = self.get(resource, item_id) | data
            if resource == "books":
                self.get("authors", data["author_id"])
                if data.get("isbn") and any(
                    x.get("isbn") == data["isbn"] and x["id"] != item_id for x in self.books.values()
                ):
                    raise HTTPException(409, "Книга с таким ISBN уже существует")
            elif any(x["name"] == data["name"] and x["id"] != item_id for x in self.authors.values()):
                raise HTTPException(409, "Автор с таким именем уже существует")
            if item_id is None:
                if resource == "books":
                    item_id = self.next_book
                    self.next_book += 1
                else:
                    item_id = self.next_author
                    self.next_author += 1
            data["id"] = item_id
            self.table(resource)[item_id] = data.copy()
            return data

    def delete(self, resource: str, item_id: int) -> None:
        with self.lock:
            self.get(resource, item_id)
            if resource == "authors" and any(x["author_id"] == item_id for x in self.books.values()):
                raise HTTPException(409, "Нельзя удалить автора, у которого есть книги")
            del self.table(resource)[item_id]

    def book_read(self, book: dict) -> dict:
        return book | {"available": book["total_copies"], "author": self.authors[book["author_id"]]["name"]}


def get_store(request: Request) -> MemoryStore:
    # Depends получает хранилище конкретного экземпляра приложения.
    return request.app.state.store
