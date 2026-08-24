from datetime import datetime
from typing import Any

from pydantic import BaseModel

from domain.applications.entities import ApplicationStatus


class ApplyToJobRequest(BaseModel):
    resume_document_id: int | None = None


class ApplicationResponse(BaseModel):
    id: int
    job_document_id: int
    resume_document_id: int
    created_at: datetime
    status: ApplicationStatus
    updated_at: datetime


class UpdateApplicationStatusRequest(BaseModel):
    status: ApplicationStatus


class RecruiterApplicationResponse(BaseModel):
    id: int
    created_at: datetime
    job_document_id: int
    job_title: str
    applicant_name: str
    applicant_email: str
    resume_document_id: int
    resume_filename: str
    resume_summary: str | None = None
    resume_technologies: list[str] = []
    matched_technologies: list[str] = []
    resume_payload: dict[str, Any]
    status: ApplicationStatus
    updated_at: datetime
