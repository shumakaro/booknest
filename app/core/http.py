"""Единые ошибки, идентификатор запроса и ограничение частоты."""

import logging
import time
from collections import defaultdict, deque
from uuid import uuid4
from fastapi import FastAPI, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from app.schemas import ErrorRead

# Один документированный конверт для общих HTTP-ошибок всех ресурсов.
ERROR_RESPONSES = {
    400: {"model": ErrorRead, "description": "Некорректный запрос"},
    401: {"model": ErrorRead, "description": "Требуется действительный токен"},
    403: {"model": ErrorRead, "description": "Недостаточно прав"},
    404: {"model": ErrorRead, "description": "Ресурс не найден"},
    405: {"model": ErrorRead, "description": "Метод не поддерживается"},
    409: {"model": ErrorRead, "description": "Конфликт состояния или уникальности"},
    422: {"model": ErrorRead, "description": "Ошибка серверной проверки данных"},
    429: {"model": ErrorRead, "description": "Слишком много запросов"},
    500: {"model": ErrorRead, "description": "Внутренняя ошибка без раскрытия подробностей"},
}

log = logging.getLogger("booknest")


def error_response(request: Request, status: int, message: str, details: object = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        headers={"X-Request-ID": getattr(request.state, "request_id", "")},
        content={
            "code": f"HTTP_{status}",
            "message": message,
            "details": jsonable_encoder(details),
            "request_id": getattr(request.state, "request_id", ""),
        },
    )


def configure_http(app: FastAPI, write_limit: int) -> None:
    # Очереди ограничителя принадлежат приложению, а не общему модулю.
    requests: dict[str, deque] = defaultdict(deque)

    @app.middleware("http")
    async def trace(request: Request, call_next) -> Response:
        started = time.perf_counter()
        request.state.request_id = str(uuid4())

        async def handle() -> Response:
            try:
                return await call_next(request)
            except Exception:
                log.exception("Сбой запроса request_id=%s", request.state.request_id)
                return error_response(
                    request, 500, "Внутренняя ошибка сервера. Сообщите идентификатор запроса"
                )

        if request.method in ["POST", "PATCH", "DELETE"]:
            host = request.client.host if request.client else "unknown"
            queue = requests[host]
            now = time.monotonic()
            while queue and queue[0] <= now - 60:
                queue.popleft()
            if len(queue) >= write_limit:
                response = error_response(request, 429, "Слишком много запросов, повторите позже")
                response.headers["Retry-After"] = "60"
            else:
                queue.append(now)
                response = await handle()
        else:
            response = await handle()
        elapsed = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Process-Time-ms"] = f"{elapsed:.1f}"
        # Личные ответы и отказы доступа не должны оставаться в HTTP-кэше после выхода.
        if (response.status_code in {401, 403} or request.headers.get("authorization")
                or request.url.path.startswith(("/auth/", "/api/v1/auth/"))):
            response.headers["Cache-Control"] = "no-store"
        log.info(
            "%s %s %s %s %.1fms",
            request.state.request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException) -> JSONResponse:
        response = error_response(request, error.status_code, str(error.detail))
        if error.headers:
            response.headers.update(error.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        # Не включаем входное значение: в нём может находиться пароль.
        details = [{"loc": item["loc"], "msg": item["msg"], "type": item["type"]} for item in error.errors()]
        return error_response(request, 422, "Проверьте введённые данные", details)

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception) -> JSONResponse:
        log.exception("Необработанная ошибка request_id=%s", request.state.request_id)
        return error_response(request, 500, "Внутренняя ошибка сервера. Сообщите идентификатор запроса")
