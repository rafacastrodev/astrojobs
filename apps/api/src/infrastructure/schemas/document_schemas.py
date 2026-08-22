from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

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


class SyncDocumentsRequest(BaseModel):
    ids: list[int] | None = None


class SyncDocumentsResponse(BaseModel):
    synced: int
    failed: int
    skipped: int
    results: list[dict[str, Any]]
