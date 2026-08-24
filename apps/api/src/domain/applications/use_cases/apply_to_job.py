from domain.applications.entities import ApplicationEntity
from domain.applications.errors import AlreadyAppliedError, NoResumeToApplyError
from domain.applications.repository import ApplicationRepository
from domain.documents.errors import DocumentNotFoundError, JobClosedError
from domain.documents.repository import DocumentRepository
from domain.notifications.publisher import NotificationPublisher, TransactionManager


class ApplyToJobUseCase:
    def __init__(
        self,
        documents: DocumentRepository,
        applications: ApplicationRepository,
        notifications: NotificationPublisher,
        transaction: TransactionManager,
    ):
        self._documents = documents
        self._applications = applications
        self._notifications = notifications
        self._transaction = transaction

    def execute(
        self,
        job_id: int,
        applicant_user_id: int,
        applicant_name: str,
        resume_document_id: int | None = None,
    ) -> ApplicationEntity:
        job = self._documents.get_by_id(job_id)
        if job is None or job.type != "job" or job.id is None:
            raise DocumentNotFoundError("Job not found")
        if job.user_id is None or job.status != "synced" or job.closed_at is not None:
            raise JobClosedError()

        resume = self._resolve_resume(applicant_user_id, resume_document_id)
        if resume.id is None:
            raise DocumentNotFoundError("Resume not found")

        existing = self._applications.get_by_job_and_applicant(
            job.id, applicant_user_id
        )
        if existing is not None:
            raise AlreadyAppliedError()

        try:
            application = self._applications.create(
                job.id,
                resume.id,
                applicant_user_id,
                job.user_id,
            )
            self._notifications.trigger(
                user_id=job.user_id,
                kind="$newApplication",
                subject_id=f"application-{job.id}-{applicant_user_id}",
                activity_data={
                    "applicationId": application.id,
                    "jobId": job.id,
                    "jobTitle": _job_title(job),
                    "applicantName": applicant_name,
                },
            )
            self._transaction.commit()
            return application
        except Exception:
            self._transaction.rollback()
            raise

    def _resolve_resume(self, applicant_user_id: int, resume_document_id: int | None):
        if resume_document_id is not None:
            resume = self._documents.get_by_id(resume_document_id)
            if (
                resume is None
                or resume.type != "resume"
                or resume.user_id != applicant_user_id
            ):
                raise DocumentNotFoundError("Resume not found")
            return resume

        resumes = self._documents.list_by_user(applicant_user_id, doc_type="resume")
        if not resumes:
            raise NoResumeToApplyError()
        return resumes[0]


def _job_title(job) -> str:
    title = job.payload.get("title") if isinstance(job.payload, dict) else None
    return (
        title.strip()
        if isinstance(title, str) and title.strip()
        else job.source_filename
    )
