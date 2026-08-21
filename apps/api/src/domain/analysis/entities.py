from dataclasses import dataclass
from datetime import datetime
from typing import Literal

JobSource = Literal["none", "catalog", "pasted"]


@dataclass
class AnalysisEntity:
    id: int | None
    user_id: int
    resume_document_id: int
    job_source: JobSource
    job_document_id: int | None
    job_title: str | None
    score: int
    summary: str
    findings: list[str]
    created_at: datetime
