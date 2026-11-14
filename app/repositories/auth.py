"""Хранилище учётных записей, отзыва токенов и журнала действий."""

from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models import AuditEvent, DeniedToken, User


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def get_user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def add_user(self, email: str, password_hash: str) -> User:
        user = User(email=email.lower(), password_hash=password_hash, role="member", is_active=True)
        self.db.add(user)
        self.db.flush()
        return user

    def revoked(self, digest: str) -> bool:
        return self.db.get(DeniedToken, digest) is not None

    def revoke(self, digest: str, expiration: datetime) -> None:
        if not self.revoked(digest):
            self.db.add(DeniedToken(digest=digest, expires_at=expiration))
            self.db.flush()

    def consume(self, digest: str, expiration: datetime) -> None:
        # В отличие от обычного logout повторная вставка здесь обязана завершиться конфликтом.
        self.db.add(DeniedToken(digest=digest, expires_at=expiration))
        self.db.flush()

    def confirm_email(self, user: User) -> None:
        user.email_verified = True
        self.db.flush()

    def audit(self, user_id: int, method: str, path: str) -> None:
        self.db.add(AuditEvent(user_id=user_id, method=method, path=path))
        self.db.flush()

    def list_audit(self, page: int, size: int, method: str | None = None) -> dict:
        # Условия применяются в SQL до count/limit, порядок однозначен даже при одинаковой дате.
        stmt = select(AuditEvent)
        if method is not None:
            stmt = stmt.where(AuditEvent.method == method)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        items = list(self.db.scalars(stmt.order_by(AuditEvent.id.desc()).offset((page - 1) * size).limit(size)))
        return {"items": items, "total": total, "page": page, "size": size}
