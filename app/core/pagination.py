"""Переиспользуемые зависимости HTTP."""

from fastapi import Query


class Pagination:
    def __init__(self, page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)) -> None:
        self.page = page
        self.size = size
        self.offset = (page - 1) * size
