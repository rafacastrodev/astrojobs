from domain.applications.entities import ApplicationEntity, ApplicationStatus
from domain.applications.errors import (
    ApplicationNotFoundError,
    InvalidApplicationTransitionError,
)
from domain.applications.repository import ApplicationRepository
from domain.documents.repository import DocumentRepository
from domain.notifications.publisher import NotificationPublisher, TransactionManager

ALLOWED_TRANSITIONS: dict[ApplicationStatus, set[ApplicationStatus]] = {
    "submitted": {"reviewing", "accepted", "rejected", "removed"},
    "reviewing": {"accepted", "rejected", "removed"},
    "accepted": {"removed"},
    "rejected": {"removed"},
    "removed": set(),
}


class UpdateApplicationStatusUseCase:
    def __init__(
        self,
        applications: ApplicationRepository,
        documents: DocumentRepository,
        notifications: NotificationPublisher,
        transaction: TransactionManager,
    ):
        self._applications = applications
        self._documents = documents
        self._notifications = notifications
        self._transaction = transaction

    def execute(
        self,
        application_id: int,
        recruiter_user_id: int,
        recruiter_name: str,
        target_status: ApplicationStatus,
    ) -> ApplicationEntity:
        application = self._applications.get_by_id(application_id)
        if application is None or application.recruiter_user_id != recruiter_user_id:
            raise ApplicationNotFoundError()
        if application.status == target_status:
            return application
        if target_status not in ALLOWED_TRANSITIONS[application.status]:
            raise InvalidApplicationTransitionError(application.status, target_status)

        job = self._documents.get_by_id(application.job_document_id)
        if job is None:
            raise ApplicationNotFoundError()
        title = job.payload.get("title") if isinstance(job.payload, dict) else None
        job_title = (
            title.strip()
            if isinstance(title, str) and title.strip()
            else job.source_filename
        )

        try:
            updated = self._applications.update_status(
                application_id,
                target_status,
                recruiter_user_id,
            )
            self._notifications.trigger(
                user_id=application.applicant_user_id,
                kind="$applicationStatusChanged",
                subject_id=f"application-status-{application_id}-{target_status}",
                activity_data={
                    "applicationId": application_id,
                    "jobId": application.job_document_id,
                    "jobTitle": job_title,
                    "recruiterName": recruiter_name,
                    "status": target_status,
                },
            )
            self._transaction.commit()
            return updated
        except Exception:
            self._transaction.rollback()
            raise
