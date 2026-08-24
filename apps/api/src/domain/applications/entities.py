from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

ApplicationStatus = Literal["submitted", "reviewing", "accepted", "rejected", "removed"]


@dataclass
class ApplicationEntity:
    id: int
    job_document_id: int
    resume_document_id: int
    applicant_user_id: int
    recruiter_user_id: int | None
    created_at: datetime
    status: ApplicationStatus = "submitted"
    updated_at: datetime | None = None


@dataclass
class RecruiterApplication:
    id: int
    created_at: datetime
    job_document_id: int
    job_title: str
    applicant_name: str
    applicant_email: str
    resume_document_id: int
    resume_filename: str
    resume_summary: str | None
    resume_technologies: list[str]
    matched_technologies: list[str]
    resume_payload: dict[str, Any]
    status: ApplicationStatus = "submitted"
    updated_at: datetime | None = None
