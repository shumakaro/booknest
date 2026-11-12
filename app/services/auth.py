"""Регистрация, одинаковая ошибка входа и ротация refresh-токенов."""

import logging
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.config import Settings
from app.core.security import (
    DUMMY_HASH,
    create_token,
    decode_token,
    hash_password,
    token_expiration,
    token_hash,
    verify_password,
)
from app.repositories.auth import AuthRepository

log = logging.getLogger("booknest.auth")


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    def register(self, email: str, password: str):
        if self.repo.by_email(email):
            raise HTTPException(409, "Этот e-mail уже зарегистрирован")
        try:
            user = self.repo.add_user(email, hash_password(password))
            self.db.commit()
            # В обычных журналах не должно быть действующего токена. Учебная демонстрация
            # сохранена за отдельным флагом для изолированной локальной консоли.
            if Settings().log_email_confirmation:
                confirmation = create_token(user.id, user.role, "email", 900)
                log.info("Учебный код подтверждения user_id=%s token=%s", user.id, confirmation)
            return user
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(409, "Этот e-mail уже зарегистрирован") from None

    def authenticate(self, email: str, password: str):
        user = self.repo.by_email(email)
        password_fits = len(password.encode("utf-8")) <= 72
        candidate = password if password_fits else "invalid-overlong-password-123"
        valid = verify_password(candidate, user.password_hash if user else DUMMY_HASH) and password_fits
        if user is None or not valid or not user.is_active:
            raise HTTPException(401, "Неверный e-mail или пароль", headers={"WWW-Authenticate": "Bearer"})
        return user

    def tokens(self, user) -> tuple[dict, str]:
        settings = Settings()
        lifetime = settings.access_ttl_seconds or settings.access_ttl_min * 60
        access = create_token(user.id, user.role, "access", lifetime)
        refresh = create_token(user.id, user.role, "refresh", settings.refresh_ttl_days * 86400)
        return {"access_token": access, "token_type": "bearer", "expires_in": lifetime}, refresh

    def refresh(self, token: str) -> tuple[dict, str]:
        payload = decode_token(token, "refresh")
        user = self.repo.get_user(int(payload["sub"]))
        if user is None or not user.is_active or self.repo.revoked(token_hash(token)):
            raise HTTPException(401, "Сеанс завершён, войдите снова")
        try:
            # Уникальный digest делает одновременное повторное использование конфликтом.
            self.repo.consume(token_hash(token), token_expiration(payload))
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(401, "Сеанс завершён, войдите снова") from None
        return self.tokens(user)

    def logout(self, tokens: list[tuple[str, str]]) -> None:
        for token, kind in tokens:
            try:
                payload = decode_token(token, kind)
            except HTTPException:
                continue
            self.repo.revoke(token_hash(token), token_expiration(payload))
        self.db.commit()
