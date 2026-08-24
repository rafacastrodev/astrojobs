import logging
from collections.abc import Callable

from domain.applications.repository import ApplicationRepository
from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.documents.pinecone_client import PineconeClientPort
from domain.documents.repository import DocumentRepository
from domain.notifications.publisher import NotificationPublisher, TransactionManager

logger = logging.getLogger(__name__)


class CloseJobUseCase:
    def __init__(
        self,
        documents: DocumentRepository,
        applications: ApplicationRepository,
        notifications: NotificationPublisher,
        transaction: TransactionManager,
        vector_store_factory: Callable[[], PineconeClientPort],
        namespace_jobs: str,
    ):
        self._documents = documents
        self._applications = applications
        self._notifications = notifications
        self._transaction = transaction
        self._vector_store_factory = vector_store_factory
        self._namespace_jobs = namespace_jobs

    def execute(self, job_id: int, recruiter_user_id: int) -> DocumentEntity:
        job = self._documents.get_by_id(job_id)
        if (
            job is None
            or job.id is None
            or job.type != "job"
            or job.user_id != recruiter_user_id
        ):
            raise DocumentNotFoundError("Job not found")
        if job.closed_at is not None:
            self._remove_vector(job)
            return job

        applications = self._applications.list_by_job(job_id)
        recipient_ids = sorted(
            {
                item.applicant_user_id
                for item in applications
                if item.status != "removed"
            }
        )
        try:
            closed = self._documents.close_job(job_id)
            for applicant_user_id in recipient_ids:
                self._notifications.trigger(
                    user_id=applicant_user_id,
                    kind="$jobClosed",
                    subject_id=f"job-closed-{job_id}",
                    activity_data={
                        "jobId": job_id,
                        "jobTitle": _job_title(job),
                    },
                )
            self._transaction.commit()
        except Exception:
            self._transaction.rollback()
            raise

        self._remove_vector(closed)
        return closed

    def _remove_vector(self, job: DocumentEntity) -> None:
        if not job.pinecone_id:
            return
        try:
            self._vector_store_factory().delete([job.pinecone_id], self._namespace_jobs)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to remove closed job vector %s: %s",
                job.pinecone_id,
                exc,
            )


def _job_title(job: DocumentEntity) -> str:
    title = job.payload.get("title") if isinstance(job.payload, dict) else None
    return (
        title.strip()
        if isinstance(title, str) and title.strip()
        else job.source_filename
    )
