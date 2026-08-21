from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AnalyzeResumeRequest(BaseModel):
    job_source: Literal["none", "catalog", "pasted"]
    job_document_id: int | None = None
    job_text: str | None = None


class AnalysisResponse(BaseModel):
    id: int
    resume_document_id: int
    job_source: Literal["none", "catalog", "pasted"]
    job_document_id: int | None
    job_title: str | None
    score: int
    summary: str
    findings: list[str]
    created_at: datetime
