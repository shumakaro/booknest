"""Чтение Open Library: фиксированный адрес, короткий кэш и бережная частота запросов."""
from collections import OrderedDict
import re
from threading import Lock
import time

import httpx
from fastapi import HTTPException
from pydantic import AliasChoices, BaseModel, Field, ValidationError


class ExternalBook(BaseModel):
    id: str
    title: str
    authors: list[str] = []
    year: int | None = None
    cover_id: int | None = None


class ExternalDetails(ExternalBook):
    description: str
    notice: str | None = None


class ExternalPage(BaseModel):
    items: list[ExternalBook]
    total: int
    page: int
    size: int
    has_more: bool


class SearchDocument(BaseModel):
    # Внешний JSON проверяется отдельно от наших ответов; лишние поля не нужны.
    key: str
    title: str = "Без названия"
    author_name: list[str] = []
    first_publish_year: int | None = None
    cover_i: int | None = None


class SearchResponse(BaseModel):
    docs: list[SearchDocument]
    total: int = Field(ge=0, validation_alias=AliasChoices("numFound", "num_found"))


class OpenLibrary:
    def __init__(self, interval: float = 1.0):
        # Кэш ограничен 128 ответами и 60 секундами; БД не используется.
        self.cache: OrderedDict[tuple, tuple[float, dict]] = OrderedDict()
        self.lock = Lock()
        self.last_request = 0.0
        self.interval = interval

    def fetch(self, path: str, params: dict | None = None) -> dict:
        key = (path, tuple(sorted((params or {}).items())))
        # Очередь не растет бесконечно при множестве пользователей.
        if not self.lock.acquire(timeout=0.1):
            raise HTTPException(503, "Глобальный поиск занят. Повторите запрос через несколько секунд.", headers={"Retry-After": "2"})
        try:
            cached = self.cache.get(key)
            if cached and cached[0] > time.monotonic():
                self.cache.move_to_end(key)
                return cached[1]
            time.sleep(max(0, self.interval - (time.monotonic() - self.last_request)))
            self.last_request = time.monotonic()
            try:
                # Пользователь не передает URL: только проверенный ID или поисковые параметры.
                response = httpx.get("https://openlibrary.org" + path, params=params, timeout=10,
                                     follow_redirects=False, headers={"User-Agent": "BookNest/1.0 (+https://github.com/shumakaro/booknest)"})
                if response.status_code == 404:
                    raise HTTPException(404, "Книга в Open Library не найдена")
                if response.status_code == 429:
                    raise HTTPException(503, "Open Library временно ограничила запросы. Попробуйте позже.", headers={"Retry-After": "10"})
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, dict):
                    raise ValueError("Ожидался JSON-объект")
            except httpx.TimeoutException:
                raise HTTPException(504, "Open Library долго не отвечает. Повторите поиск позже.") from None
            except (httpx.HTTPError, ValueError):
                raise HTTPException(502, "Не удалось получить данные Open Library. Попробуйте позже.") from None
            self.cache[key] = (time.monotonic() + 60, data)
            self.cache.move_to_end(key)
            while len(self.cache) > 128:
                self.cache.popitem(last=False)
            return data
        finally:
            self.lock.release()

    def search(self, title: str, author: str, page: int, size: int) -> ExternalPage:
        params = {"page": page, "limit": size,
                  "fields": "key,title,author_name,first_publish_year,cover_i"}
        if title:
            params["title"] = title
        if author:
            params["author"] = author
        try:
            data = SearchResponse.model_validate(self.fetch("/search.json", params))
        except ValidationError:
            raise HTTPException(502, "Open Library вернула неполные результаты. Повторите поиск позже.") from None
        items = []
        for doc in data.docs:
            # Open Library встречается с обоими форматами ключа произведения.
            work_id = doc.key.removeprefix("/works/")
            if re.fullmatch(r"OL\d+W", work_id):
                items.append(ExternalBook(id=work_id, title=doc.title, authors=doc.author_name,
                                          year=doc.first_publish_year, cover_id=doc.cover_i))
        return ExternalPage(items=items, total=data.total, page=page, size=size,
                            has_more=bool(items) and page * size < data.total)

    def details(self, work_id: str) -> ExternalDetails:
        data = self.fetch(f"/works/{work_id}.json")
        description = data.get("description", "Описание отсутствует.")
        if isinstance(description, dict):
            description = description.get("value", "Описание отсутствует.")
        if not isinstance(description, str):
            description = "Описание отсутствует."
        authors = []
        notice = None
        references = data.get("authors", [])
        if not isinstance(references, list):
            references = []
        # Не загружаем десятки авторов одной книги; частичная ошибка не скрывает описание.
        for reference in references[:3]:
            author_ref = reference.get("author") if isinstance(reference, dict) else None
            key = author_ref.get("key", "") if isinstance(author_ref, dict) else ""
            if not isinstance(key, str) or not re.fullmatch(r"/authors/OL\d+A", key):
                continue
            try:
                author = self.fetch(key + ".json")
                if isinstance(author.get("name"), str):
                    authors.append(author["name"])
            except HTTPException:
                notice = "Часть сведений об авторах сейчас недоступна."
        if len(references) > 3:
            notice = "Показаны первые три автора; полный список доступен в Open Library."
        title = data.get("title")
        if not isinstance(title, str):
            raise HTTPException(502, "Open Library вернула неполные сведения о книге.")
        covers = data.get("covers", [])
        cover = next((item for item in covers if isinstance(item, int) and item > 0), None) if isinstance(covers, list) else None
        # Дата произведения бывает текстом; не выдаем год неизвестного издания за точный.
        year = re.search(r"\b(\d{4})\b", str(data.get("first_publish_date", "")))
        return ExternalDetails(id=work_id, title=title, authors=authors, description=description,
                               year=int(year[1]) if year else None, cover_id=cover, notice=notice)


library = OpenLibrary()


def get_open_library() -> OpenLibrary:
    return library
