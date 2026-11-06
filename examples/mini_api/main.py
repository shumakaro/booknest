"""Микропроект W12: пять эндпоинтов списка задач, отдельно от предметной области BookNest."""

from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class MiniSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    mini_secret_key: str = Field(min_length=32)
    mini_username: str
    mini_password_hash: str


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Название обязательно")
        return value.strip()


class TaskUpdate(BaseModel):
    done: bool


class TaskRead(TaskCreate):
    id: int
    done: bool


class MiniToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


def create_app(settings: MiniSettings | None = None) -> FastAPI:
    config = settings or MiniSettings()
    app = FastAPI(title="TaskMini API", version="1.0.0")
    tasks: dict[int, dict] = {}
    sequence = 0
    bcrypt = CryptContext(schemes=["bcrypt"])
    bearer = OAuth2PasswordBearer(tokenUrl="/token")

    def current_user(token: Annotated[str, Depends(bearer)]) -> str:
        try:
            payload = jwt.decode(
                token, config.mini_secret_key, algorithms=["HS256"], options={"require_exp": True}
            )
            if payload["sub"] != config.mini_username:
                raise ValueError()
            return payload["sub"]
        except (JWTError, KeyError, ValueError):
            raise HTTPException(401, "Требуется вход") from None

    @app.post("/token", response_model=MiniToken, status_code=200)
    def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> dict:
        valid = bcrypt.verify(form.password, config.mini_password_hash)
        if form.username != config.mini_username or not valid:
            raise HTTPException(401, "Неверные учётные данные")
        token = jwt.encode(
            {"sub": config.mini_username, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            config.mini_secret_key,
            algorithm="HS256",
        )
        return {"access_token": token, "token_type": "bearer"}

    @app.get("/tasks", response_model=list[TaskRead], status_code=200)
    def list_tasks(user: Annotated[str, Depends(current_user)]) -> list:
        return list(tasks.values())

    @app.post("/tasks", response_model=TaskRead, status_code=201)
    def create_task(payload: TaskCreate, user: Annotated[str, Depends(current_user)]) -> dict:
        nonlocal sequence
        sequence += 1
        task = {"id": sequence, "title": payload.title, "done": False}
        tasks[sequence] = task
        return task

    @app.get("/tasks/{task_id}", response_model=TaskRead, status_code=200)
    def get_task(task_id: int, user: Annotated[str, Depends(current_user)]) -> dict:
        if task_id not in tasks:
            raise HTTPException(404, "Задача не найдена")
        return tasks[task_id]

    @app.patch("/tasks/{task_id}", response_model=TaskRead, status_code=200)
    def update_task(task_id: int, payload: TaskUpdate, user: Annotated[str, Depends(current_user)]) -> dict:
        task = get_task(task_id, user)
        task["done"] = payload.done
        return task

    return app


# Запуск: uvicorn examples.mini_api.main:create_app --factory --port <свободный порт>.
