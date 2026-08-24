from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from domain.users.profile import canonical_profile_region, validate_salary_range


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
    company: str | None = Field(default=None, max_length=120)
    job_title: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    salary_min_usd: int | None = None
    salary_max_usd: int | None = None

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.lower()

    @field_validator("company", "job_title")
    @classmethod
    def _trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("region")
    @classmethod
    def _canonical_region(cls, value: str | None) -> str | None:
        return canonical_profile_region(value, required=False)

    @model_validator(mode="after")
    def _professional_profile(self) -> "SignupRequest":
        validate_salary_range(self.salary_min_usd, self.salary_max_usd)
        return self


class UpdateProfileRequest(BaseModel):
    company: str | None = Field(default=None, max_length=120)
    job_title: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    salary_min_usd: int | None = None
    salary_max_usd: int | None = None
    onboarding_status: Literal["skipped", "completed"] | None = None

    @field_validator("company", "job_title")
    @classmethod
    def _trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("region")
    @classmethod
    def _canonical_region(cls, value: str | None) -> str | None:
        return canonical_profile_region(value, required=False)

    @model_validator(mode="after")
    def _salary_range(self) -> "UpdateProfileRequest":
        validate_salary_range(self.salary_min_usd, self.salary_max_usd)
        return self


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
    photo_url: str | None = None
    company: str | None = None
    job_title: str | None = None
    region: str | None = None
    salary_min_usd: int | None = None
    salary_max_usd: int | None = None
    onboarding_status: Literal["pending", "skipped", "completed"] = "completed"
