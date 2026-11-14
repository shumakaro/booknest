"""Диагностический отчет не должен раскрывать секреты или подключаться к чужой БД."""

from tools.audit_neon import check_connection


def test_audit_refuses_non_neon_without_connecting(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Подключение не должно начинаться")

    monkeypatch.setattr("tools.audit_neon.create_engine", forbidden)
    assert check_connection("postgresql+psycopg://test:example@localhost/books", []) == {
        "status": "failed", "reason": "expected_neon_host",
    }


def test_audit_refuses_neon_without_required_tls(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Незащищенное подключение не должно начинаться")

    monkeypatch.setattr("tools.audit_neon.create_engine", forbidden)
    assert check_connection("postgresql+psycopg://test:example@unit.neon.tech/books", []) == {
        "status": "failed", "reason": "tls_required",
    }


def test_audit_redacts_connection_error_and_disposes_engine(monkeypatch):
    # Имитируется ошибка с секретом внутри: библиотечный текст не должен попасть в JSON.
    class BrokenEngine:
        disposed = False

        def connect(self):
            raise RuntimeError("password=private-example-secret")

        def dispose(self):
            self.disposed = True

    engine = BrokenEngine()
    monkeypatch.setattr("tools.audit_neon.create_engine", lambda *args, **kwargs: engine)
    result = check_connection(
        "postgresql+psycopg://test:example@unit.neon.tech/books?sslmode=require", []
    )
    assert result == {"status": "failed", "error_type": "RuntimeError"}
    assert engine.disposed
