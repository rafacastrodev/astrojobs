from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from domain.applications.entities import ApplicationEntity, ApplicationStatus
from domain.applications.errors import AlreadyAppliedError, ApplicationNotFoundError
from infrastructure.models.application_model import (
    ApplicationModel,
    ApplicationStatusHistoryModel,
)


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
            self._session.flush()
            self._session.add(
                ApplicationStatusHistoryModel(
                    application_id=model.id,
                    from_status=None,
                    to_status="submitted",
                    changed_by_user_id=applicant_user_id,
                    created_at=model.created_at,
                )
            )
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            raise AlreadyAppliedError() from exc
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

    def get_by_id(self, application_id: int) -> ApplicationEntity | None:
        model = self._session.get(ApplicationModel, application_id)
        return self._to_entity(model) if model else None

    def update_status(
        self,
        application_id: int,
        status: ApplicationStatus,
        changed_by_user_id: int,
    ) -> ApplicationEntity:
        model = self._session.get(ApplicationModel, application_id)
        if model is None:
            raise ApplicationNotFoundError()
        previous = model.status
        model.status = status
        model.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(
            ApplicationStatusHistoryModel(
                application_id=model.id,
                from_status=previous,
                to_status=status,
                changed_by_user_id=changed_by_user_id,
                created_at=model.updated_at,
            )
        )
        self._session.flush()
        return self._to_entity(model)

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

    def list_by_job(self, job_document_id: int) -> Sequence[ApplicationEntity]:
        models = (
            self._session.query(ApplicationModel)
            .filter(ApplicationModel.job_document_id == job_document_id)
            .order_by(ApplicationModel.created_at.asc())
            .all()
        )
        return [self._to_entity(model) for model in models]

    def list_by_applicant(self, applicant_user_id: int) -> Sequence[ApplicationEntity]:
        models = (
            self._session.query(ApplicationModel)
            .filter(ApplicationModel.applicant_user_id == applicant_user_id)
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
            status=model.status,  # type: ignore[arg-type]
            updated_at=model.updated_at,
        )
