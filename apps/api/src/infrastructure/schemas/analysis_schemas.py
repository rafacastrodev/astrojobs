from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AnalyzeResumeRequest(BaseModel):
    job_source: Literal["none", "catalog", "pasted"]
    job_document_id: int | None = None
    job_text: str | None = None


class AnalysisFeedbackRequest(BaseModel):
    rating: Literal["up", "down"]
    expected_score: int | None = None
    comment: str | None = None


class AnalysisFeedbackResponse(BaseModel):
    rating: Literal["up", "down"]
    expected_score: int | None
    comment: str | None
    updated_at: datetime


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
    feedback: AnalysisFeedbackResponse | None = None
