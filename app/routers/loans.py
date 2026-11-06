"""Выдачи защищены личностью и проверкой владения, отчёт — ролью."""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import CurrentUser, Database, Librarian, get_own_loan
from app.core.pagination import Pagination
from app.models import Loan
from app.schemas import LoanCreate, LoanRead, LoanReturn, Page
from app.services.catalog import LoanService

router = APIRouter(tags=["loans"])
Paging = Annotated[Pagination, Depends()]
OwnLoan = Annotated[Loan, Depends(get_own_loan)]


@router.post("/books/{item_id}/loans", response_model=LoanRead, status_code=201)
def issue_book(item_id: int, payload: LoanCreate, db: Database, user: CurrentUser):
    """Читатель может оформить выдачу только на себя; библиотекарь — на выбранного читателя."""
    target = payload.user_id or user.id
    if target != user.id and user.role != "librarian":
        raise HTTPException(403, "Нельзя оформить выдачу на другого читателя")
    return LoanService(db).issue(item_id, target, payload.due_date)


@router.get("/loans", response_model=Page[LoanRead], status_code=200)
def list_loans(db: Database, pagination: Paging, user: CurrentUser) -> dict:
    user_id = None if user.role == "librarian" else user.id
    return LoanService(db).repo.list(user_id, pagination.page, pagination.size)


@router.get("/loans/{loan_id}", response_model=LoanRead, status_code=200)
def get_loan(loan: OwnLoan):
    return loan


@router.patch("/loans/{loan_id}", response_model=LoanRead, status_code=200)
def return_book(loan_id: int, payload: LoanReturn, db: Database, loan: OwnLoan):
    """Проверка владельца выполняется до изменения состояния выдачи."""
    return LoanService(db).return_book(loan_id)


@router.get("/reports/overdue-loans", response_model=Page[LoanRead], status_code=200)
def overdue_loans(db: Database, pagination: Paging, user: Librarian) -> dict:
    return LoanService(db).repo.overdue(pagination.page, pagination.size)
