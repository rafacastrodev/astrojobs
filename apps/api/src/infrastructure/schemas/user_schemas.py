from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[A-Za-z0-9]+$",
        description="Unique username containing only letters and numbers",
    )
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["professional", "recruiter"]

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.lower()


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def normalize_login_identifier(cls, value: str) -> str:
        identifier = value.strip()
        if "@" not in identifier:
            return identifier.lower()
        return identifier


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Literal["professional", "recruiter"]
    created_at: datetime
