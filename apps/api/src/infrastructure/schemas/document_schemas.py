from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from infrastructure.schemas.analysis_schemas import AnalysisResponse


class DocumentResponse(BaseModel):
    id: int
    type: Literal["resume", "job"]
    payload: dict[str, Any]
    source_filename: str
    status: Literal["draft", "synced", "failed"]
    pinecone_id: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class ResumeResponse(BaseModel):
    id: int
    payload: dict[str, Any]
    source_filename: str
    status: Literal["draft", "synced", "failed"]
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    latest_analysis: AnalysisResponse | None = None


class JobSummaryResponse(BaseModel):
    id: int
    title: str
    source_filename: str


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    requirements: list[str] = Field(default_factory=list, max_length=50)
    responsibilities: list[str] = Field(default_factory=list, max_length=50)
    seniority: Literal[
        "intern", "junior", "mid", "senior", "lead", "principal", "staff", "unspecified"
    ] = "unspecified"
    employment_type: Literal[
        "full-time", "part-time", "contract", "internship", "temporary", "unspecified"
    ] = "unspecified"

    @field_validator("title")
    @classmethod
    def _trim_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Job title cannot be empty")
        return value

    @field_validator("requirements", "responsibilities")
    @classmethod
    def _clean_items(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))

    @model_validator(mode="after")
    def _require_job_content(self) -> "JobCreateRequest":
        if not self.requirements and not self.responsibilities:
            raise ValueError("Add at least one requirement or responsibility")
        return self


class JobMatchResponse(BaseModel):
    id: int
    title: str
    source_filename: str
    score: float
    payload: dict[str, Any]


class SyncDocumentsRequest(BaseModel):
    ids: list[int] | None = None


class SyncDocumentsResponse(BaseModel):
    synced: int
    failed: int
    skipped: int
    results: list[dict[str, Any]]
