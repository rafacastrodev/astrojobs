from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from domain.offers.entities import OfferEntity
from domain.offers.errors import AlreadyOfferedError
from infrastructure.models.offer_model import OfferModel


class SqlAlchemyOfferRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self,
        *,
        job_document_id: int,
        resume_document_id: int,
        professional_user_id: int,
        recruiter_user_id: int,
        message: str,
    ) -> OfferEntity:
        model = OfferModel(
            job_document_id=job_document_id,
            resume_document_id=resume_document_id,
            professional_user_id=professional_user_id,
            recruiter_user_id=recruiter_user_id,
            message=message,
        )
        self._session.add(model)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            raise AlreadyOfferedError() from exc
        return self._to_entity(model)

    def get_by_job_and_professional(
        self, job_document_id: int, professional_user_id: int
    ) -> OfferEntity | None:
        model = (
            self._session.query(OfferModel)
            .filter(
                OfferModel.job_document_id == job_document_id,
                OfferModel.professional_user_id == professional_user_id,
            )
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def list_job_ids_for_professional(self, professional_user_id: int) -> Sequence[int]:
        rows = (
            self._session.query(OfferModel.job_document_id)
            .filter(OfferModel.professional_user_id == professional_user_id)
            .all()
        )
        return [job_id for (job_id,) in rows]

    def list_job_ids_for_professionals(
        self, professional_user_ids: Sequence[int]
    ) -> dict[int, set[int]]:
        if not professional_user_ids:
            return {}
        rows = (
            self._session.query(
                OfferModel.professional_user_id,
                OfferModel.job_document_id,
            )
            .filter(OfferModel.professional_user_id.in_(list(professional_user_ids)))
            .all()
        )
        result: dict[int, set[int]] = {}
        for professional_user_id, job_id in rows:
            result.setdefault(professional_user_id, set()).add(job_id)
        return result

    @staticmethod
    def _to_entity(model: OfferModel) -> OfferEntity:
        return OfferEntity(
            id=model.id,
            job_document_id=model.job_document_id,
            resume_document_id=model.resume_document_id,
            professional_user_id=model.professional_user_id,
            recruiter_user_id=model.recruiter_user_id,
            message=model.message,
            created_at=model.created_at,
        )
