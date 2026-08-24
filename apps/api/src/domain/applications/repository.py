from collections.abc import Sequence
from typing import Protocol

from domain.applications.entities import ApplicationEntity


class ApplicationRepository(Protocol):
    def create(
        self,
        job_document_id: int,
        resume_document_id: int,
        applicant_user_id: int,
        recruiter_user_id: int | None,
    ) -> ApplicationEntity: ...

    def get_by_job_and_applicant(
        self, job_document_id: int, applicant_user_id: int
    ) -> ApplicationEntity | None: ...

    def list_job_ids_for_applicant(self, applicant_user_id: int) -> Sequence[int]: ...

    def list_by_recruiter(self, recruiter_user_id: int) -> Sequence[ApplicationEntity]: ...
