from collections.abc import Sequence
from typing import Protocol

from domain.offers.entities import OfferEntity


class OfferRepository(Protocol):
    def create(
        self,
        *,
        job_document_id: int,
        resume_document_id: int,
        professional_user_id: int,
        recruiter_user_id: int,
        message: str,
    ) -> OfferEntity: ...

    def get_by_job_and_professional(
        self, job_document_id: int, professional_user_id: int
    ) -> OfferEntity | None: ...

    def list_job_ids_for_professional(
        self, professional_user_id: int
    ) -> Sequence[int]: ...

    def list_job_ids_for_professionals(
        self, professional_user_ids: Sequence[int]
    ) -> dict[int, set[int]]: ...
