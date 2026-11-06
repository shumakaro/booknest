"""Три разные проверки: личность, роль и владелец конкретной выдачи."""

from typing import Annotated
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.security import decode_token, token_hash
from app.db import get_db
from app.models import Loan, User
from app.repositories.auth import AuthRepository
from app.repositories.catalog import LoanRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
Database = Annotated[Session, Depends(get_db)]


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Database) -> User:
    payload = decode_token(token)
    repo = AuthRepository(db)
    user = repo.get_user(int(payload["sub"]))
    if user is None or not user.is_active or repo.revoked(token_hash(token)):
        raise HTTPException(401, "Требуется действительный токен", headers={"WWW-Authenticate": "Bearer"})
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(role: str):
    def check(user: CurrentUser, request: Request, db: Database) -> User:
        if user.role != role:
            raise HTTPException(403, "Недостаточно прав")
        if request.method in ["POST", "PATCH", "DELETE"]:
            # Запись участвует в той же транзакции, что и действие каталога.
            AuthRepository(db).audit(user.id, request.method, request.url.path)
        return user

    return check


Librarian = Annotated[User, Depends(require_role("librarian"))]


def get_own_loan(loan_id: int, user: CurrentUser, db: Database) -> Loan:
    loan = LoanRepository(db).get(loan_id)
    if loan is None or (user.role != "librarian" and loan.user_id != user.id):
        raise HTTPException(404, "Выдача не найдена")
    return loan
