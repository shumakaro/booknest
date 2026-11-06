"""Контракты запросов и ответов BookNest."""


from typing import Annotated, Generic, Literal, TypeVar
from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")
Genre = Literal["scifi", "history", "poetry", "cs", "fiction"]
Sort = Annotated[str, Field(pattern=r"^-?(title|year|id)(,-?(title|year|id))*$")]


class Page(BaseModel, Generic[T]):
    # Один конверт используется в списках книг и авторов.
    items: list[T]
    total: int
    page: int
    size: int


class AuthorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    birth_year: int | None = Field(default=None, ge=1000, le=2100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        # Пробелы не должны превращаться в имя автора.
        value = value.strip()
        if not value:
            raise ValueError("Имя не может состоять из пробелов")
        return value


class AuthorUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    birth_year: int | None = Field(default=None, ge=1000, le=2100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Имя обязательно")
        return value.strip()


class AuthorRead(AuthorCreate):
    id: int


class BookCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    author_id: int = Field(gt=0)
    year: int = Field(ge=1450, le=2100)
    isbn: str | None = Field(default=None, pattern=r"^\d{13}$")
    genre: Genre = "fiction"
    total_copies: int = Field(default=1, ge=0, le=10000)
    description: str = Field(default="", max_length=10000)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        # Убираем лишние пробелы до сохранения книги.
        value = value.strip()
        if not value:
            raise ValueError("Название не может состоять из пробелов")
        return value

    @field_validator("isbn")
    @classmethod
    def check_isbn(cls, value: str | None) -> str | None:
        # ISBN-13 содержит контрольную цифру, одной длины недостаточно.
        if value is not None:
            checksum = sum(int(char) * (1 if index % 2 == 0 else 3) for index, char in enumerate(value))
            if checksum % 10:
                raise ValueError("Неверная контрольная цифра ISBN-13")
        return value


class BookUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    author_id: int | None = Field(default=None, gt=0)
    year: int | None = Field(default=None, ge=1450, le=2100)
    isbn: str | None = Field(default=None, pattern=r"^\d{13}$")
    genre: Genre | None = None
    total_copies: int | None = Field(default=None, ge=0, le=10000)
    description: str | None = Field(default=None, max_length=10000)

    @field_validator("title", "author_id", "year", "genre", "total_copies", "description")
    @classmethod
    def reject_null(cls, value: object) -> object:
        # Отсутствующее поле разрешено, явный null для обязательного поля — нет.
        if value is None:
            raise ValueError("Поле не может быть null")
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("Поле не может быть пустым")
        return value

    @field_validator("isbn")
    @classmethod
    def check_isbn(cls, value: str | None) -> str | None:
        return BookCreate.check_isbn(value)


class BookRead(BookCreate):
    id: int
    available: int
    author: str


class HealthRead(BaseModel):
    status: str


class ErrorRead(BaseModel):
    code: str
    message: str
    details: object | None = None
    request_id: str

