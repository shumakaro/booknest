"""Данные пользователя и токенов без password_hash в ответе."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Пароль должен занимать не более 72 байт для bcrypt")
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Пароль должен содержать буквы и цифры")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: Literal["member", "librarian"]
    is_active: bool
    email_verified: bool


class TokenRead(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    expires_in: int


class MessageRead(BaseModel):
    message: str


class ConfirmationRequest(BaseModel):
    token: str = Field(min_length=1, max_length=4096)
