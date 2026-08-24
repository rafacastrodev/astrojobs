from dataclasses import dataclass
from datetime import datetime
from typing import Literal

JobSource = Literal["none", "catalog", "pasted"]
FeedbackRating = Literal["up", "down"]
AtsCategory = Literal["low", "medium", "high"]


def ats_category_for_score(score: int) -> AtsCategory:
    if score < 50:
        return "low"
    if score < 75:
        return "medium"
    return "high"


@dataclass
class AnalysisFeedbackEntity:
    id: int | None
    analysis_id: int
    rating: FeedbackRating
    expected_score: int | None
    comment: str | None
    created_at: datetime
    updated_at: datetime


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
    years_of_experience: int | None
    technologies: list[str]
    companies: list[str]
    created_at: datetime
    feedback: AnalysisFeedbackEntity | None = None
    ats_category: AtsCategory = "low"
