"""ЛР9–10: существующий журнал каталога доступен только библиотекарю и только для чтения."""
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, Response
from app.core.auth import Database, Librarian
from app.core.pagination import Pagination
from app.repositories.auth import AuthRepository
from app.schemas import AuditEventRead, Page

router = APIRouter(tags=["audit"])


@router.get("/audit-events", response_model=Page[AuditEventRead])
def list_audit_events(
    db: Database, user: Librarian, response: Response, pagination: Annotated[Pagination, Depends()],
    method: Literal["POST", "PATCH", "DELETE"] | None = None,
) -> dict:
    """Права проверяются независимо от видимости ссылки в клиенте; тела запросов не выдаются."""
    response.headers["Cache-Control"] = "no-store"
    return AuthRepository(db).list_audit(pagination.page, pagination.size, method)
