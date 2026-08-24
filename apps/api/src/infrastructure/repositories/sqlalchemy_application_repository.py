from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from domain.applications.entities import ApplicationEntity
from domain.applications.errors import AlreadyAppliedError
from infrastructure.models.application_model import ApplicationModel


class SqlAlchemyApplicationRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self,
        job_document_id: int,
        resume_document_id: int,
        applicant_user_id: int,
        recruiter_user_id: int | None,
    ) -> ApplicationEntity:
        model = ApplicationModel(
            job_document_id=job_document_id,
            resume_document_id=resume_document_id,
            applicant_user_id=applicant_user_id,
            recruiter_user_id=recruiter_user_id,
        )
        self._session.add(model)
        try:
            self._session.commit()
        except IntegrityError as exc:
            self._session.rollback()
            raise AlreadyAppliedError() from exc
        self._session.refresh(model)
        return self._to_entity(model)

    def get_by_job_and_applicant(
        self, job_document_id: int, applicant_user_id: int
    ) -> ApplicationEntity | None:
        model = (
            self._session.query(ApplicationModel)
            .filter(
                ApplicationModel.job_document_id == job_document_id,
                ApplicationModel.applicant_user_id == applicant_user_id,
            )
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def list_job_ids_for_applicant(self, applicant_user_id: int) -> Sequence[int]:
        rows = (
            self._session.query(ApplicationModel.job_document_id)
            .filter(ApplicationModel.applicant_user_id == applicant_user_id)
            .all()
        )
        return [job_id for (job_id,) in rows]

    def list_by_recruiter(self, recruiter_user_id: int) -> Sequence[ApplicationEntity]:
        models = (
            self._session.query(ApplicationModel)
            .filter(ApplicationModel.recruiter_user_id == recruiter_user_id)
            .order_by(ApplicationModel.created_at.desc())
            .all()
        )
        return [self._to_entity(model) for model in models]

    def _to_entity(self, model: ApplicationModel) -> ApplicationEntity:
        return ApplicationEntity(
            id=model.id,
            job_document_id=model.job_document_id,
            resume_document_id=model.resume_document_id,
            applicant_user_id=model.applicant_user_id,
            recruiter_user_id=model.recruiter_user_id,
            created_at=model.created_at,
        )
