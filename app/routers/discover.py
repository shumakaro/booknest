"""Независимый глобальный поиск: только чтение, без операций с Neon и JWT."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from app.services.open_library import ExternalDetails, ExternalPage, OpenLibrary, get_open_library

router = APIRouter(prefix="/discover", tags=["global search"])
Library = Annotated[OpenLibrary, Depends(get_open_library)]


@router.get("/books", response_model=ExternalPage)
def search_books(library: Library, title: str = Query("", max_length=200),
                 author: str = Query("", max_length=200), page: int = Query(1, ge=1, le=1000),
                 size: int = Query(20, ge=1, le=40)):
    # Пустой запрос не вызывает внешний сервис и не начинает выгрузку всего каталога.
    title, author = title.strip(), author.strip()
    if not title and not author:
        raise HTTPException(422, "Введите название книги или автора")
    return library.search(title, author, page, size)


@router.get("/books/{work_id}", response_model=ExternalDetails)
def book_details(library: Library, work_id: str = Path(pattern=r"^OL\d+W$", max_length=30)):
    # Внешний ключ никогда не передается в локальные маршруты /books/{число}.
    return library.details(work_id)
