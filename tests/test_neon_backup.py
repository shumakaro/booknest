"""Защиты резервного копирования проверяются без соединений с настоящими базами."""
import pytest
from sqlalchemy.engine import make_url

from tools.backup_neon import (
    SafetyError, child_environment, connection_options, private_directory,
    require_new_database, reuse_default_public_schema, validate_connections,
)

DIRECT = "postgresql+psycopg://source:p%40ss@unit.neon.tech/books?sslmode=require"
LOCAL = "postgresql+psycopg://local:example@127.0.0.1/books_test"


@pytest.mark.parametrize("source,local,target", [
    (DIRECT.replace("unit.neon", "unit-pooler.neon"), LOCAL, "booknest_check_restore_test"),
    (DIRECT.replace("sslmode=require", "sslmode=disable"), LOCAL, "booknest_check_restore_test"),
    (DIRECT, LOCAL.replace("127.0.0.1", "remote.example.test"), "booknest_check_restore_test"),
    (DIRECT, LOCAL.replace("books_test", "books"), "booknest_check_restore_test"),
    (DIRECT, LOCAL, "books_test"),
    (DIRECT, LOCAL, "booknest_check_restore_test;DROP DATABASE books"),
])
def test_backup_rejects_unsafe_target_or_connection(source, local, target):
    with pytest.raises(SafetyError):
        validate_connections(make_url(source), make_url(local), target)


def test_backup_credentials_are_passed_to_child_environment(monkeypatch):
    # Старые libpq service/options не должны перенаправить дочернюю программу к другой базе.
    monkeypatch.setenv("PGSERVICE", "unrelated-service")
    monkeypatch.setenv("PGHOSTADDR", "192.0.2.10")
    monkeypatch.setenv("PGOPTIONS", "unrelated-options")
    env = child_environment(connection_options(make_url(DIRECT)))
    assert env["PGPASSWORD"] == "p@ss"
    assert env["PGSSLMODE"] == "require"
    assert not {"PGSERVICE", "PGHOSTADDR", "PGOPTIONS"} & env.keys()


def test_backup_refuses_directory_outside_private_workspace(tmp_path):
    with pytest.raises(SafetyError, match="private_workspace_directory_required"):
        private_directory(tmp_path, tmp_path / "docs" / "public-backup")
    with pytest.raises(SafetyError):
        private_directory(tmp_path, tmp_path.parent / "outside")


def test_restore_refuses_existing_database_without_mutation():
    class ExistingDatabase:
        def execute(self, statement, params):
            assert statement.startswith("SELECT")
            assert params == ("booknest_check_restore_test",)
            return self

        def fetchone(self):
            return (1,)

    with pytest.raises(SafetyError, match="restore_target_already_exists"):
        require_new_database(ExistingDatabase(), "booknest_check_restore_test")


def test_restore_list_preserves_all_data_and_other_schemas():
    contents = ("1; 2615 2200 SCHEMA - public owner\n"
                "2; 2615 2201 SCHEMA - other owner\n"
                "3; 1259 100 TABLE public books owner\n"
                "4; 0 100 TABLE DATA public books owner\n")
    listing = reuse_default_public_schema(contents)
    assert ";1; 2615 2200 SCHEMA - public owner" in listing
    assert "\n2; 2615 2201 SCHEMA - other owner\n" in listing
    assert "\n3; 1259 100 TABLE public books owner\n" in listing
    assert "\n4; 0 100 TABLE DATA public books owner\n" in listing
