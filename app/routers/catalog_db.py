"""HTTP-маршруты постоянного каталога; SQL и бизнес-правил здесь нет."""

from typing import Annotated, Literal
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.pagination import Pagination
from app.core.auth import Librarian
from app.db import get_db
from app.schemas import (
    AuthorCreate,
    AuthorRead,
    AuthorUpdate,
    BookCreate,
    BookRead,
    BookUpdate,
    Genre,
    Page,
    Sort,
)
from app.services.catalog import CatalogService

router = APIRouter()
Paging = Annotated[Pagination, Depends()]


def get_catalog(db: Annotated[Session, Depends(get_db)]) -> CatalogService:
    return CatalogService(db)


Catalog = Annotated[CatalogService, Depends(get_catalog)]
ERRORS = {
    404: {"description": "Запись не найдена"},
    409: {"description": "Конфликт данных"},
    422: {"description": "Ошибка проверки"},
}


@router.get("/books", response_model=Page[BookRead], status_code=200, tags=["books"], responses=ERRORS)
def list_books(
    service: Catalog,
    pagination: Paging,
    q: str = "",
    genre: Genre | None = None,
    available_only: bool = False,
    sort: Sort = "title",
    search_mode: Literal["contains", "fulltext"] = "contains",
) -> dict:
    """Каталог фильтруется и разбивается на страницы в PostgreSQL."""
    return service.repo.list_books(
        page=pagination.page,
        size=pagination.size,
        q=q,
        genre=genre,
        available_only=available_only,
        sort=sort,
        search_mode=search_mode,
    )


@router.get("/books/{item_id}", response_model=BookRead, status_code=200, tags=["books"], responses=ERRORS)
def get_book(item_id: int, service: Catalog) -> dict:
    """Детали книги с тем же контрактом, что в лабораторной 7."""
    return service.read("books", item_id)


@router.post("/books", response_model=BookRead, status_code=201, tags=["books"], responses=ERRORS)
def create_book(payload: BookCreate, service: Catalog, user: Librarian) -> dict:
    """Создание книги и её связи с жанром в одной транзакции."""
    return service.save("books", payload.model_dump())


@router.patch("/books/{item_id}", response_model=BookRead, status_code=200, tags=["books"], responses=ERRORS)
def update_book(item_id: int, payload: BookUpdate, service: Catalog, user: Librarian) -> dict:
    """Частичное изменение без затирания отсутствующих полей."""
    return service.save("books", payload.model_dump(exclude_unset=True), item_id)


@router.delete("/books/{item_id}", response_model=None, status_code=204, tags=["books"], responses=ERRORS)
def delete_book(item_id: int, service: Catalog, user: Librarian) -> Response:
    """Мягкое удаление скрывает книгу, сохраняя историю выдач."""
    service.delete("books", item_id)
    return Response(status_code=204)


@router.get("/authors", response_model=Page[AuthorRead], status_code=200, tags=["authors"], responses=ERRORS)
def list_authors(service: Catalog, pagination: Paging, q: str = "") -> dict:
    """Список авторов с общей зависимостью страницы."""
    return service.repo.list_authors(pagination.page, pagination.size, q)


@router.get(
    "/authors/{item_id}", response_model=AuthorRead, status_code=200, tags=["authors"], responses=ERRORS
)
def get_author(item_id: int, service: Catalog) -> dict:
    """Чтение автора."""
    return service.read("authors", item_id)


@router.post("/authors", response_model=AuthorRead, status_code=201, tags=["authors"], responses=ERRORS)
def create_author(payload: AuthorCreate, service: Catalog, user: Librarian) -> dict:
    """Создание автора."""
    return service.save("authors", payload.model_dump())


@router.patch(
    "/authors/{item_id}", response_model=AuthorRead, status_code=200, tags=["authors"], responses=ERRORS
)
def update_author(item_id: int, payload: AuthorUpdate, service: Catalog, user: Librarian) -> dict:
    """Изменение полей автора."""
    return service.save("authors", payload.model_dump(exclude_unset=True), item_id)


@router.delete("/authors/{item_id}", response_model=None, status_code=204, tags=["authors"], responses=ERRORS)
def delete_author(item_id: int, service: Catalog, user: Librarian) -> Response:
    """Удаление автора без зависимых книг."""
    service.delete("authors", item_id)
    return Response(status_code=204)


@router.get(
    "/authors/{item_id}/books",
    response_model=Page[BookRead],
    status_code=200,
    tags=["authors"],
    responses=ERRORS,
)
def author_books(item_id: int, service: Catalog, pagination: Paging) -> dict:
    """Книги существующего автора, включая фильтр мягкого удаления."""
    service.get("authors", item_id)
    return service.repo.list_books(page=pagination.page, size=pagination.size, author_id=item_id)
