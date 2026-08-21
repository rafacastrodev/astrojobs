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
    ) -> AnalysisEntity: ...

    def get_by_id(self, analysis_id: int) -> AnalysisEntity | None: ...

    def list_by_resume(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]: ...


class AnalysisFeedbackRepository(Protocol):
    def upsert(
        self,
        analysis_id: int,
        rating: FeedbackRating,
        expected_score: int | None,
        comment: str | None,
    ) -> AnalysisFeedbackEntity: ...
