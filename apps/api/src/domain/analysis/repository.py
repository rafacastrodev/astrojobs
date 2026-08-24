from collections.abc import Sequence
from typing import Protocol

from domain.analysis.entities import (
    AnalysisEntity,
    AnalysisFeedbackEntity,
    FeedbackRating,
    JobSource,
)


class AnalysisRepository(Protocol):
    def create(
        self,
        user_id: int,
        resume_document_id: int,
        job_source: JobSource,
        job_document_id: int | None,
        job_title: str | None,
        score: int,
        summary: str,
        findings: list[str],
        years_of_experience: int | None,
        technologies: list[str],
        companies: list[str],
    ) -> AnalysisEntity: ...

    def get_by_id(self, analysis_id: int) -> AnalysisEntity | None: ...

    def list_by_resume(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]: ...

    def get_latest_general(
        self, resume_document_id: int, user_id: int
    ) -> AnalysisEntity | None: ...

    def list_with_feedback(self) -> Sequence[AnalysisEntity]: ...

    def list_latest_general_by_resume_ids(
        self, resume_ids: Sequence[int]
    ) -> dict[int, AnalysisEntity]: ...


class AnalysisFeedbackRepository(Protocol):
    def upsert(
        self,
        analysis_id: int,
        rating: FeedbackRating,
        expected_score: int | None,
        comment: str | None,
    ) -> AnalysisFeedbackEntity: ...
