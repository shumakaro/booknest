"""Выдача и возврат книги как операции над ресурсом loans."""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.pagination import Pagination
from app.db import get_db
from app.schemas import LoanCreate, LoanRead, LoanReturn, Page
from app.services.catalog import LoanService

router = APIRouter(tags=["loans"])
Database = Annotated[Session, Depends(get_db)]


@router.post("/books/{item_id}/loans", response_model=LoanRead, status_code=201)
def issue_book(item_id: int, payload: LoanCreate, db: Database):
    """Выдать экземпляр с проверкой доступности внутри транзакции."""
    return LoanService(db).issue(item_id, payload.user_id, payload.due_date)


@router.get("/loans", response_model=Page[LoanRead], status_code=200)
def list_loans(db: Database, pagination: Annotated[Pagination, Depends()]) -> dict:
    """Список выдач; ограничение по владельцу добавляется на этапе JWT."""
    return LoanService(db).repo.list(None, pagination.page, pagination.size)


@router.get("/loans/{loan_id}", response_model=LoanRead, status_code=200)
def get_loan(loan_id: int, db: Database):
    loan = LoanService(db).repo.get(loan_id)
    if loan is None:
        raise HTTPException(404, "Выдача не найдена")
    return loan


@router.patch("/loans/{loan_id}", response_model=LoanRead, status_code=200)
def return_book(loan_id: int, payload: LoanReturn, db: Database):
    """Переход в состояние returned сохраняет дату возврата."""
    return LoanService(db).return_book(loan_id)
