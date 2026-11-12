"""Сравнивает metadata с локальной _test БД без upgrade/downgrade и применения DDL."""
import os
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from alembic import command
from alembic.config import Config
from app.config import Settings
from tools.measure_orm import validate_test_url


def main() -> None:
    settings = Settings()
    target = validate_test_url(settings.test_database_url, settings.database_url)
    keys = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]
    previous = {key: os.environ.get(key) for key in keys}
    try:
        # Alembic читает Settings в своем env.py: оба источника направляются только в _test.
        for key in keys:
            os.environ[key] = target
        result = StringIO()
        with redirect_stdout(result):
            command.check(Config("alembic.ini"))
        Path("docs/improvements/stage12-alembic-check.txt").write_text(result.getvalue(), encoding="utf-8")
        print(result.getvalue().strip())
    finally:
        # Изменяется только окружение текущего процесса, .env не перезаписывается.
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


if __name__ == "__main__":
    main()
