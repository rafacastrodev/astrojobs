from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Literal["user", "admin"]
    created_at: datetime


class DocumentResponse(BaseModel):
    id: int
    type: Literal["resume", "job"]
    payload: dict[str, Any]
    source_filename: str
    status: Literal["draft", "synced", "failed"]
    pinecone_id: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class SyncDocumentsRequest(BaseModel):
    ids: Optional[list[int]] = None


class SyncDocumentsResponse(BaseModel):
    synced: int
    failed: int
    skipped: int
    results: list[dict[str, Any]]
