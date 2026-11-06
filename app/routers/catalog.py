"""Маршруты каталога: преобразуют HTTP-запросы в вызовы репозитория."""

from typing import Annotated
from fastapi import APIRouter, Depends, Response
from app.core.pagination import Pagination
from app.repositories.memory import MemoryStore, get_store
from app.schemas import AuthorCreate, AuthorRead, AuthorUpdate, BookCreate, BookRead, BookUpdate, Genre, Page, Sort

router = APIRouter()
Store = Annotated[MemoryStore, Depends(get_store)]
Paging = Annotated[Pagination, Depends()]
ERRORS = {
    404: {"description": "Запись не найдена"},
    409: {"description": "Конфликт данных"},
    422: {"description": "Ошибка проверки данных"},
    429: {"description": "Слишком много запросов"},
}


@router.get("/books", response_model=Page[BookRead], status_code=200, tags=["books"], responses=ERRORS)
def list_books(
    store: Store,
    pagination: Paging,
    q: str = "",
    genre: Genre | None = None,
    available_only: bool = False,
    sort: Sort = "title",
) -> dict:
    """Получить каталог с фильтрами и сортировкой по нескольким полям."""
    fields = sort.split(",")
    items = []
    for book in store.books.values():
        if q.casefold() not in book["title"].casefold():
            continue
        if genre and book["genre"] != genre:
            continue
        if available_only and book["total_copies"] == 0:
            continue
        items.append(store.book_read(book))
    # Последовательная стабильная сортировка сохраняет приоритет полей.
    items.sort(key=lambda item: item["id"])
    for field in reversed(fields):
        items.sort(key=lambda item: item[field.lstrip("-")], reverse=field.startswith("-"))
    return {
        "items": items[pagination.offset : pagination.offset + pagination.size],
        "total": len(items),
        "page": pagination.page,
        "size": pagination.size,
    }


@router.get("/books/{item_id}", response_model=BookRead, status_code=200, tags=["books"], responses=ERRORS)
def get_book(item_id: int, store: Store) -> dict:
    """Получить одну книгу или 404."""
    return store.book_read(store.get("books", item_id))


@router.post("/books", response_model=BookRead, status_code=201, tags=["books"], responses=ERRORS)
def create_book(payload: BookCreate, store: Store) -> dict:
    """Создать книгу; ISBN должен быть уникальным."""
    return store.book_read(store.save("books", payload.model_dump()))


@router.patch("/books/{item_id}", response_model=BookRead, status_code=200, tags=["books"], responses=ERRORS)
def update_book(item_id: int, payload: BookUpdate, store: Store) -> dict:
    """Изменить только переданные поля книги."""
    return store.book_read(store.save("books", payload.model_dump(exclude_unset=True), item_id))


@router.delete("/books/{item_id}", response_model=None, status_code=204, tags=["books"], responses=ERRORS)
def delete_book(item_id: int, store: Store) -> Response:
    """Удалить книгу без тела ответа."""
    store.delete("books", item_id)
    return Response(status_code=204)


@router.get("/authors", response_model=Page[AuthorRead], status_code=200, tags=["authors"], responses=ERRORS)
def list_authors(store: Store, pagination: Paging, q: str = "") -> dict:
    """Получить авторов с общей зависимостью пагинации."""
    items = [item for item in store.authors.values() if q.casefold() in item["name"].casefold()]
    items.sort(key=lambda item: item["id"])
    return {
        "items": items[pagination.offset : pagination.offset + pagination.size],
        "total": len(items),
        "page": pagination.page,
        "size": pagination.size,
    }


@router.get(
    "/authors/{item_id}", response_model=AuthorRead, status_code=200, tags=["authors"], responses=ERRORS
)
def get_author(item_id: int, store: Store) -> dict:
    """Получить одного автора."""
    return store.get("authors", item_id)


@router.post("/authors", response_model=AuthorRead, status_code=201, tags=["authors"], responses=ERRORS)
def create_author(payload: AuthorCreate, store: Store) -> dict:
    """Создать автора."""
    return store.save("authors", payload.model_dump())


@router.patch(
    "/authors/{item_id}", response_model=AuthorRead, status_code=200, tags=["authors"], responses=ERRORS
)
def update_author(item_id: int, payload: AuthorUpdate, store: Store) -> dict:
    """Частично обновить автора."""
    return store.save("authors", payload.model_dump(exclude_unset=True), item_id)


@router.delete("/authors/{item_id}", response_model=None, status_code=204, tags=["authors"], responses=ERRORS)
def delete_author(item_id: int, store: Store) -> Response:
    """Удалить автора, если на него не ссылаются книги."""
    store.delete("authors", item_id)
    return Response(status_code=204)


@router.get(
    "/authors/{item_id}/books",
    response_model=Page[BookRead],
    status_code=200,
    tags=["authors"],
    responses=ERRORS,
)
def author_books(item_id: int, store: Store, pagination: Paging) -> dict:
    """Получить книги существующего автора."""
    store.get("authors", item_id)
    items = [store.book_read(item) for item in store.books.values() if item["author_id"] == item_id]
    items.sort(key=lambda item: item["id"])
    return {
        "items": items[pagination.offset : pagination.offset + pagination.size],
        "total": len(items),
        "page": pagination.page,
        "size": pagination.size,
    }
