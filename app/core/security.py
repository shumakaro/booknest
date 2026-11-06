"""Хеширование паролей и JWT без чувствительных данных в payload."""

import hashlib
import time
from datetime import datetime, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException
from app.config import Settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Хеш пустышки нужен для одинаковой по смыслу проверки отсутствующей учётной записи.
DUMMY_HASH = password_context.hash("not-an-account-7654321")


def hash_password(password: str) -> str:
    """bcrypt сам генерирует соль; исходный пароль не сохраняется."""
    return password_context.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_context.verify(password, stored_hash)
    except (ValueError, TypeError):
        # Старые неактивные SQL-примеры не содержат пригодного пароля.
        password_context.verify(password, DUMMY_HASH)
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_token(user_id: int, role: str, kind: str, seconds: int) -> str:
    # Дробный NumericDate позволяет отличать токены, выпущенные в одну секунду, без jti.
    now = time.time()
    payload = {"sub": str(user_id), "role": role, "iat": now, "exp": now + seconds, "type": kind}
    return jwt.encode(payload, Settings().secret_key, algorithm="HS256")


def decode_token(token: str, kind: str = "access") -> dict:
    try:
        payload = jwt.decode(
            token,
            Settings().secret_key,
            algorithms=["HS256"],
            options={"require_exp": True, "require_iat": True, "require_sub": True},
        )
        if set(payload) != {"sub", "role", "iat", "exp", "type"}:
            raise ValueError("Неверный состав claims")
        if payload["type"] != kind or payload["role"] not in ["member", "librarian"]:
            raise ValueError("Неверный тип или роль")
        if int(payload["sub"]) <= 0 or payload["iat"] > time.time() + 10:
            raise ValueError("Неверное время или пользователь")
        return payload
    except (JWTError, ValueError, TypeError, KeyError):
        raise HTTPException(
            401, "Требуется действительный токен", headers={"WWW-Authenticate": "Bearer"}
        ) from None


def token_expiration(payload: dict) -> datetime:
    return datetime.fromtimestamp(payload["exp"], timezone.utc)
