from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from domain.documents.technology_catalog import canonical_technology
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
    analysis_status: Literal["pending", "completed", "failed"]
    analysis_error_message: str | None
    created_at: datetime
    updated_at: datetime
    latest_analysis: AnalysisResponse | None = None


class ProcessResumeRequest(BaseModel):
    force_analysis: bool = False


class RenameResumeRequest(BaseModel):
    source_filename: str = Field(min_length=1, max_length=200)


class JobSummaryResponse(BaseModel):
    id: int
    title: str
    source_filename: str


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    technologies: list[str] = Field(default_factory=list, max_length=40)
    description: str = Field(default="", max_length=8_000)
    seniority: Literal["intern", "junior", "mid", "senior", "lead", "principal", "staff"]
    work_mode: Literal["remote", "hybrid", "on-site"]
    region: str = Field(min_length=1, max_length=120)
    employment_type: Literal["full-time", "part-time", "contract", "internship", "temporary"]

    @field_validator("title")
    @classmethod
    def _trim_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Job title cannot be empty")
        return value

    @field_validator("description")
    @classmethod
    def _trim_description(cls, value: str) -> str:
        return value.strip()

    @field_validator("region")
    @classmethod
    def _trim_region(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Region cannot be empty")
        return value

    @field_validator("technologies")
    @classmethod
    def _clean_technologies(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in value:
            raw = item.strip()
            tech = canonical_technology(raw)
            if raw and tech is None:
                raise ValueError(f"Unknown technology: {raw}")
            if tech is None:
                continue
            key = tech.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(tech)
        return cleaned

    @model_validator(mode="after")
    def _require_technologies(self) -> "JobCreateRequest":
        if not self.technologies:
            raise ValueError("Add at least one technology")
        return self


class JobMatchResponse(BaseModel):
    id: int
    title: str
    source_filename: str
    score: float
    payload: dict[str, Any]
    matched_technologies: list[str] = []
    applied: bool = False
    recruiter_name: str | None = None
    recruiter_email: str | None = None


class MatchedJobSummary(BaseModel):
    id: int
    title: str


class ResumeMatchResponse(BaseModel):
    id: int
    source_filename: str
    score: float
    matched_technologies: list[str]
    matched_jobs: list[MatchedJobSummary]
    payload: dict[str, Any]
    summary: str | None = None


class SyncDocumentsRequest(BaseModel):
    ids: list[int] | None = None


class SyncDocumentsResponse(BaseModel):
    synced: int
    failed: int
    skipped: int
    results: list[dict[str, Any]]
