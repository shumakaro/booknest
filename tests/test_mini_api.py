"""Мини-API проверяется отдельно и не использует данные BookNest."""

import secrets
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from examples.mini_api.main import MiniSettings, create_app


def test_independent_mini_api():
    config = MiniSettings(
        mini_secret_key=secrets.token_hex(32),
        mini_username="student",
        mini_password_hash=CryptContext(schemes=["bcrypt"]).hash("TaskMini123"),
    )
    with TestClient(create_app(config)) as client:
        assert client.get("/tasks").status_code == 401
        assert client.post("/token", data={"username": "student", "password": "bad"}).status_code == 401
        token = client.post("/token", data={"username": "student", "password": "TaskMini123"}).json()[
            "access_token"
        ]
        client.headers["Authorization"] = "Bearer " + token
        assert client.post("/tasks", json={"title": " "}).status_code == 422
        task = client.post("/tasks", json={"title": "Подготовить защиту"})
        assert task.status_code == 201
        task_id = task.json()["id"]
        assert client.get(f"/tasks/{task_id}").status_code == 200
        assert client.patch(f"/tasks/{task_id}", json={"done": True}).json()["done"] is True
        assert len(client.get("/tasks").json()) == 1
        assert client.get("/tasks/99999").status_code == 404
