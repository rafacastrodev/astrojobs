from domain.applications.entities import ApplicationEntity
from domain.applications.errors import AlreadyAppliedError, NoResumeToApplyError
from domain.applications.repository import ApplicationRepository
from domain.documents.errors import DocumentNotFoundError
from domain.documents.repository import DocumentRepository


class ApplyToJobUseCase:
    def __init__(
        self,
        documents: DocumentRepository,
        applications: ApplicationRepository,
    ):
        self._documents = documents
        self._applications = applications

    def execute(
        self,
        job_id: int,
        applicant_user_id: int,
        resume_document_id: int | None = None,
    ) -> ApplicationEntity:
        job = self._documents.get_by_id(job_id)
        if job is None or job.type != "job" or job.id is None:
            raise DocumentNotFoundError("Job not found")

        resume = self._resolve_resume(applicant_user_id, resume_document_id)
        if resume.id is None:
            raise DocumentNotFoundError("Resume not found")

        existing = self._applications.get_by_job_and_applicant(job.id, applicant_user_id)
        if existing is not None:
            raise AlreadyAppliedError()

        return self._applications.create(
            job.id,
            resume.id,
            applicant_user_id,
            job.user_id,
        )

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
