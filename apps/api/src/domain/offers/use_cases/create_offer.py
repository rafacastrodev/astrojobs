from domain.applications.repository import ApplicationRepository
from domain.documents.errors import DocumentNotFoundError, JobClosedError
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.match_resumes_for_jobs import MatchResumesForJobsUseCase
from domain.notifications.publisher import NotificationPublisher, TransactionManager
from domain.offers.entities import OfferEntity
from domain.offers.errors import (
    AlreadyOfferedError,
    CannotOfferApplicantError,
    InvalidOfferMessageError,
)
from domain.offers.repository import OfferRepository
from domain.users.repository import UserRepository


class CreateOfferUseCase:
    def __init__(
        self,
        documents: DocumentRepository,
        applications: ApplicationRepository,
        offers: OfferRepository,
        matcher: MatchResumesForJobsUseCase,
        users: UserRepository,
        notifications: NotificationPublisher,
        transaction: TransactionManager,
    ):
        self._documents = documents
        self._applications = applications
        self._offers = offers
        self._matcher = matcher
        self._users = users
        self._notifications = notifications
        self._transaction = transaction

    def execute(
        self,
        *,
        job_id: int,
        resume_document_id: int,
        recruiter_user_id: int,
        recruiter_name: str,
        message: str,
    ) -> OfferEntity:
        cleaned_message = message.strip()
        if not cleaned_message or len(cleaned_message) > 500:
            raise InvalidOfferMessageError(
                "Offer message must contain between 1 and 500 characters"
            )

        job = self._documents.get_by_id(job_id)
        if (
            job is None
            or job.id is None
            or job.type != "job"
            or job.user_id != recruiter_user_id
        ):
            raise DocumentNotFoundError("Job not found")
        if job.status != "synced" or job.closed_at is not None:
            raise JobClosedError()

        resume = self._documents.get_by_id(resume_document_id)
        if (
            resume is None
            or resume.id is None
            or resume.type != "resume"
            or resume.user_id is None
        ):
            raise DocumentNotFoundError("Professional resume not found")

        professional_user_id = resume.user_id
        professional = self._users.get_by_id(professional_user_id)
        if professional is None or professional.role != "professional":
            raise DocumentNotFoundError("Professional resume not found")
        is_match = any(
            match.document.id == resume_document_id
            and any(matched_job.id == job_id for matched_job in match.matched_jobs)
            for match in self._matcher.execute(recruiter_user_id)
        )
        if not is_match:
            raise DocumentNotFoundError("Matching professional not found")
        if self._applications.get_by_job_and_applicant(job_id, professional_user_id):
            raise CannotOfferApplicantError()
        if self._offers.get_by_job_and_professional(job_id, professional_user_id):
            raise AlreadyOfferedError()

        try:
            offer = self._offers.create(
                job_document_id=job_id,
                resume_document_id=resume_document_id,
                professional_user_id=professional_user_id,
                recruiter_user_id=recruiter_user_id,
                message=cleaned_message,
            )
            self._notifications.trigger(
                user_id=professional_user_id,
                kind="$jobOffer",
                subject_id=f"offer-{job_id}-{professional_user_id}",
                activity_data={
                    "offerId": offer.id,
                    "jobId": job_id,
                    "jobTitle": _job_title(job),
                    "recruiterName": recruiter_name,
                    "message": cleaned_message,
                },
            )
            self._transaction.commit()
            return offer
        except Exception:
            self._transaction.rollback()
            raise


def _job_title(job) -> str:
    title = job.payload.get("title") if isinstance(job.payload, dict) else None
    return (
        title.strip()
        if isinstance(title, str) and title.strip()
        else job.source_filename
    )
