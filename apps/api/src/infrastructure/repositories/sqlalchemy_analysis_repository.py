from collections.abc import Sequence

from sqlalchemy.orm import Session

from domain.analysis.entities import AnalysisEntity, JobSource
from infrastructure.models.analysis_model import AnalysisModel


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
        )
