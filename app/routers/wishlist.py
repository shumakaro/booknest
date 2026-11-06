"""HTTP списка желаемого: доступ только к данным текущего пользователя."""

from typing import Annotated
from fastapi import APIRouter, Depends, Response
from sqlalchemy.exc import IntegrityError
from app.core.auth import CurrentUser, Database
from app.core.pagination import Pagination
from app.repositories.wishlist import WishlistRepository
from app.schemas import BookRead, Page
from app.services.catalog import CatalogService

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=Page[BookRead], status_code=200)
def list_wishlist(db: Database, user: CurrentUser, pagination: Annotated[Pagination, Depends()]) -> dict:
    return WishlistRepository(db).list(user.id, pagination.page, pagination.size)


@router.post("/{book_id}", response_model=None, status_code=204)
def add_wishlist(book_id: int, db: Database, user: CurrentUser) -> Response:
    CatalogService(db).get("books", book_id)
    try:
        WishlistRepository(db).add(user.id, book_id)
        db.commit()
    except IntegrityError:
        db.rollback()
    return Response(status_code=204)


@router.delete("/{book_id}", response_model=None, status_code=204)
def remove_wishlist(book_id: int, db: Database, user: CurrentUser) -> Response:
    WishlistRepository(db).remove(user.id, book_id)
    db.commit()
    return Response(status_code=204)
