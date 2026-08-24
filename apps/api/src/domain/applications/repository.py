from collections.abc import Sequence
from typing import Protocol

from domain.applications.entities import ApplicationEntity, ApplicationStatus


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

    def get_by_id(self, application_id: int) -> ApplicationEntity | None: ...

    def update_status(
        self,
        application_id: int,
        status: ApplicationStatus,
        changed_by_user_id: int,
    ) -> ApplicationEntity: ...

    def list_job_ids_for_applicant(self, applicant_user_id: int) -> Sequence[int]: ...

    def list_by_recruiter(
        self, recruiter_user_id: int
    ) -> Sequence[ApplicationEntity]: ...

    def list_by_job(self, job_document_id: int) -> Sequence[ApplicationEntity]: ...

    def list_by_applicant(
        self, applicant_user_id: int
    ) -> Sequence[ApplicationEntity]: ...
