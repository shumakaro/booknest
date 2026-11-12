"""Создает конфигурацию отдельного Docker-стенда, никогда не перезаписывая готовый файл."""
import argparse
import json
from pathlib import Path
import secrets


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(".tools/containers-check.env"))
    parser.add_argument("--port", type=int, default=8184)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        raise SystemExit("Выберите локальный порт от 1024 до 65535")
    origin = f"http://127.0.0.1:{args.port}"
    values = {"POSTGRES_DB": "booknest", "POSTGRES_USER": "booknest",
              "POSTGRES_PASSWORD": secrets.token_hex(24), "SECRET_KEY": secrets.token_hex(32),
              "WEB_BIND": "127.0.0.1", "WEB_PORT": str(args.port),
              "CORS_ORIGINS": json.dumps([origin]), "COOKIE_SECURE": "false",
              "LOG_EMAIL_CONFIRMATION": "false", "PLAYWRIGHT_BASE_URL": origin,
              "DOCKER_SUBNET": "172.29.242.0/24", "WEB_INTERNAL_IP": "172.29.242.10"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Режим x атомарно отказывает даже при уже существующем пустом файле.
        with args.output.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write("".join(f"{key}={value}\n" for key, value in values.items()))
    except FileExistsError:
        raise SystemExit("Файл уже существует. Существующие пароли и настройки сохранены.") from None
    print(f"Создана отдельная конфигурация {args.output}; значения секретов не выводятся.")


if __name__ == "__main__":
    main()
