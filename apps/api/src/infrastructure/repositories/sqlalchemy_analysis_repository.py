from collections.abc import Sequence

from sqlalchemy.orm import Session

from domain.analysis.entities import (
    AnalysisEntity,
    AnalysisFeedbackEntity,
    FeedbackRating,
    JobSource,
)
from infrastructure.models.analysis_feedback_model import AnalysisFeedbackModel
from infrastructure.models.analysis_model import AnalysisModel


def _to_feedback_entity(model: AnalysisFeedbackModel) -> AnalysisFeedbackEntity:
    return AnalysisFeedbackEntity(
        id=model.id,
        analysis_id=model.analysis_id,
        rating=model.rating,  # type: ignore[arg-type]
        expected_score=model.expected_score,
        comment=model.comment,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class SqlAlchemyAnalysisRepository:
    def __init__(self, session: Session):
        self._session = session

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
    ) -> AnalysisEntity:
        model = AnalysisModel(
            user_id=user_id,
            resume_document_id=resume_document_id,
            job_source=job_source,
            job_document_id=job_document_id,
            job_title=job_title,
            score=score,
            summary=summary,
            findings=findings,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def get_by_id(self, analysis_id: int) -> AnalysisEntity | None:
        model = self._session.get(AnalysisModel, analysis_id)
        return self._to_entity(model) if model else None

    def list_by_resume(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]:
        models = (
            self._session.query(AnalysisModel)
            .filter(
                AnalysisModel.resume_document_id == resume_document_id,
                AnalysisModel.user_id == user_id,
            )
            .order_by(AnalysisModel.created_at.desc())
            .all()
        )
        return [self._to_entity(model) for model in models]

    @staticmethod
    def _to_entity(model: AnalysisModel) -> AnalysisEntity:
        return AnalysisEntity(
            id=model.id,
            user_id=model.user_id,
            resume_document_id=model.resume_document_id,
            job_source=model.job_source,  # type: ignore[arg-type]
            job_document_id=model.job_document_id,
            job_title=model.job_title,
            score=model.score,
            summary=model.summary,
            findings=model.findings,
            created_at=model.created_at,
            feedback=_to_feedback_entity(model.feedback) if model.feedback else None,
        )


class SqlAlchemyAnalysisFeedbackRepository:
    def __init__(self, session: Session):
        self._session = session

    def upsert(
        self,
        analysis_id: int,
        rating: FeedbackRating,
        expected_score: int | None,
        comment: str | None,
    ) -> AnalysisFeedbackEntity:
        model = (
            self._session.query(AnalysisFeedbackModel)
            .filter(AnalysisFeedbackModel.analysis_id == analysis_id)
            .one_or_none()
        )
        if model is None:
            model = AnalysisFeedbackModel(analysis_id=analysis_id)
            self._session.add(model)

        model.rating = rating
        model.expected_score = expected_score
        model.comment = comment

        self._session.commit()
        self._session.refresh(model)
        return _to_feedback_entity(model)
