"""OAuth2-вход и безопасная передача refresh через HttpOnly cookie."""

import time
from collections import deque
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from app.config import Settings
from app.core.auth import CurrentUser, Database
from app.core.security import decode_token, token_expiration, token_hash
from app.schemas.auth import ConfirmationRequest, MessageRead, RegisterRequest, TokenRead, UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def set_refresh(response: Response, token: str) -> None:
    settings = Settings()
    response.set_cookie(
        "refresh_token",
        token,
        max_age=settings.refresh_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def check_cookie_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in Settings().cors_origins:
        raise HTTPException(403, "Источник запроса не разрешён")


async def limit_login(request: Request) -> None:
    queues = getattr(request.app.state, "login_attempts", None)
    if queues is None:
        queues = {}
        request.app.state.login_attempts = queues
    host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    # Удаляем истёкшие очереди, чтобы не накапливать адреса бесконечно.
    for key in list(queues):
        queue = queues[key]
        while queue and queue[0] <= now - 300:
            queue.popleft()
        if not queue:
            del queues[key]
    queue = queues.setdefault(host, deque())
    if len(queue) >= 5:
        raise HTTPException(
            429, "Слишком много попыток входа, повторите через 5 минут", headers={"Retry-After": "300"}
        )
    queue.append(now)


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: RegisterRequest, db: Database):
    """Регистрация всегда создаёт member; роль нельзя назначить телом запроса."""
    return AuthService(db).register(str(payload.email), payload.password)


@router.post("/token", response_model=TokenRead, status_code=200, dependencies=[Depends(limit_login)])
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: Database, response: Response):
    """Пароль передаётся как OAuth2 form; при любой неудаче сообщение одинаковое."""
    service = AuthService(db)
    user = service.authenticate(form.username, form.password)
    access, refresh = service.tokens(user)
    set_refresh(response, refresh)
    return access


@router.post("/refresh", response_model=TokenRead, status_code=200)
def refresh(request: Request, response: Response, db: Database):
    """Одноразовое обновление с отзывом прежнего refresh-токена."""
    check_cookie_origin(request)
    cookie = request.cookies.get("refresh_token")
    if not cookie:
        raise HTTPException(401, "Сеанс завершён, войдите снова")
    access, new_refresh = AuthService(db).refresh(cookie)
    set_refresh(response, new_refresh)
    return access


@router.get("/me", response_model=UserRead, status_code=200)
def me(user: CurrentUser, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout", response_model=None, status_code=204, openapi_extra={"security": [{}]})
def logout(
    request: Request, db: Database, token: Annotated[str | None, Depends(optional_oauth2)] = None
) -> Response:
    check_cookie_origin(request)
    tokens = []
    if token:
        tokens.append((token, "access"))
    refresh = request.cookies.get("refresh_token")
    if refresh:
        tokens.append((refresh, "refresh"))
    try:
        AuthService(db).logout(tokens)
    except IntegrityError:
        # Два одновременных выхода приводят к тому же отзыву; выход остаётся идемпотентным.
        db.rollback()
    response = Response(status_code=204)
    response.delete_cookie(
        "refresh_token", path="/", httponly=True, secure=Settings().cookie_secure, samesite="strict"
    )
    return response


@router.post("/confirm-email", response_model=MessageRead, status_code=200)
def confirm_email(payload: ConfirmationRequest, db: Database) -> dict:
    """Учебный временный код берётся из локальной консоли, реальная почта не отправляется."""
    claims = decode_token(payload.token, "email")
    service = AuthService(db)
    user = service.repo.get_user(int(claims["sub"]))
    if user is None or service.repo.revoked(token_hash(payload.token)):
        raise HTTPException(401, "Код подтверждения недействителен")
    try:
        service.repo.consume(token_hash(payload.token), token_expiration(claims))
        service.repo.confirm_email(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(401, "Код подтверждения уже использован") from None
    return {"message": "Адрес подтверждён"}
