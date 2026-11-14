"""Контракт внешнего поиска проверяется без Интернета и без рабочей базы данных."""
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.services.open_library import OpenLibrary, get_open_library


@pytest.fixture
def external(monkeypatch):
    calls, replies = [], []

    def get(url, **kwargs):
        calls.append((url, kwargs))
        reply = replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        status, body = reply
        return httpx.Response(status, json=body, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "get", get)
    application = create_app()
    library = OpenLibrary(interval=0)
    application.dependency_overrides[get_open_library] = lambda: library
    with TestClient(application) as client:
        yield client, replies, calls, library


def test_title_author_pagination_and_cache(external):
    client, replies, calls, library = external
    replies.append((200, {"numFound": 41, "docs": [{"key": "/works/OL1W", "title": "Книга",
                      "author_name": ["Автор"], "first_publish_year": 2000, "cover_i": 123}]}))
    response = client.get("/api/v1/discover/books", params={"title": "Книга", "author": "Автор", "page": 2})
    assert response.status_code == 200
    assert response.json() == {"items": [{"id": "OL1W", "title": "Книга", "authors": ["Автор"], "year": 2000, "cover_id": 123}],
                               "total": 41, "page": 2, "size": 20, "has_more": True}
    assert calls[0][0] == "https://openlibrary.org/search.json"
    assert calls[0][1]["params"]["page"] == 2
    assert calls[0][1]["params"]["author"] == "Автор"
    assert client.get("/api/v1/discover/books", params={"title": "Книга", "author": "Автор", "page": 2}).json() == response.json()
    assert len(calls) == 1
    # Истечение кэша приводит к новому запросу, а не к сохранению старых результатов навсегда.
    key = next(iter(library.cache))
    library.cache[key] = (0, {})
    replies.append((200, {"num_found": 0, "docs": []}))
    assert client.get("/api/v1/discover/books", params={"title": "Книга", "author": "Автор", "page": 2}).json()["total"] == 0
    assert len(calls) == 2


@pytest.mark.parametrize("query", ["", "?title=%20", "?title=x&page=0", "?author=x&size=100", "?title=x&page=1001"])
def test_invalid_queries_do_not_call_upstream(external, query):
    client, _, calls, _ = external
    assert client.get("/api/v1/discover/books" + query).status_code == 422
    assert not calls


@pytest.mark.parametrize("upstream, expected", [
    ((500, {}), 502), ((429, {}), 503), ((200, []), 502), ((200, {"docs": "bad"}), 502),
    (httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("offline"), 502),
])
def test_external_failures_have_normal_error_envelope(external, upstream, expected):
    client, replies, _, _ = external
    replies.append(upstream)
    response = client.get("/api/v1/discover/books?title=test")
    assert response.status_code == expected
    assert response.json()["code"] == f"HTTP_{expected}"
    assert response.json()["request_id"]
    # Код, реально полученный клиентом, должен быть описан и в Swagger.
    documented = client.get("/openapi.json").json()["paths"]["/api/v1/discover/books"]["get"]["responses"]
    assert documented[str(expected)]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorRead"
    }


def test_end_of_results_and_bad_work_ids(external):
    client, replies, calls, _ = external
    replies.append((200, {"numFound": 21, "docs": [{"key": "OL2W", "title": "Конец"}]}))
    assert client.get("/api/v1/discover/books?title=x&page=2").json()["has_more"] is False
    before = len(calls)
    assert client.get("/api/v1/discover/books/https:evil").status_code == 422
    assert len(calls) == before


def test_details_and_partial_author_failure(external):
    client, replies, _, _ = external
    replies.extend([(200, {"title": "Книга", "description": {"value": "Описание"}, "covers": [-1, 123],
                          "first_publish_date": "January 2001", "authors": [{"author": {"key": "/authors/OL1A"}},
                                                                         {"author": {"key": "/authors/OL2A"}}]}),
                    (200, {"name": "Автор"}), (503, {})])
    result = client.get("/api/v1/discover/books/OL1W").json()
    assert result["authors"] == ["Автор"]
    assert result["description"] == "Описание"
    assert result["cover_id"] == 123 and result["year"] == 2001
    assert result["notice"]


def test_work_not_found(external):
    client, replies, _, _ = external
    replies.append((404, {}))
    assert client.get("/api/v1/discover/books/OL999W").status_code == 404


def test_busy_search_returns_retry_hint_without_upstream_call(external):
    client, _, calls, library = external
    library.lock.acquire()
    try:
        response = client.get("/api/v1/discover/books?title=test")
        assert response.status_code == 503
        assert response.headers["retry-after"] == "2"
        assert not calls
    finally:
        library.lock.release()


def test_cache_is_bounded(external):
    client, replies, _, library = external
    for number in range(130):
        replies.append((200, {"numFound": 0, "docs": []}))
        assert client.get(f"/api/v1/discover/books?title=book{number}").status_code == 200
    assert len(library.cache) == 128
