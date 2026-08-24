from collections.abc import Sequence

from domain.analysis.repository import AnalysisRepository
from domain.applications.entities import RecruiterApplication
from domain.applications.repository import ApplicationRepository
from domain.documents.repository import DocumentRepository
from domain.users.repository import UserRepository


class ListRecruiterApplicationsUseCase:
    def __init__(
        self,
        applications: ApplicationRepository,
        documents: DocumentRepository,
        users: UserRepository,
        analyses: AnalysisRepository,
    ):
        self._applications = applications
        self._documents = documents
        self._users = users
        self._analyses = analyses

    def execute(self, recruiter_user_id: int) -> Sequence[RecruiterApplication]:
        applications = self._applications.list_by_recruiter(recruiter_user_id)
        resume_ids = [
            application.resume_document_id for application in applications
        ]
        analyses = self._analyses.list_latest_general_by_resume_ids(resume_ids)
        results: list[RecruiterApplication] = []
        for application in applications:
            job = self._documents.get_by_id(application.job_document_id)
            resume = self._documents.get_by_id(application.resume_document_id)
            applicant = self._users.get_by_id(application.applicant_user_id)
            if job is None or resume is None or applicant is None:
                continue
            analysis = analyses.get(resume.id) if resume.id is not None else None
            payload = resume.payload if isinstance(resume.payload, dict) else {}
            title = payload_title(job.payload, job.source_filename)
            results.append(
                RecruiterApplication(
                    id=application.id,
                    created_at=application.created_at,
                    job_document_id=application.job_document_id,
                    job_title=title,
                    applicant_name=applicant.name,
                    resume_document_id=application.resume_document_id,
                    resume_filename=resume.source_filename,
                    resume_summary=analysis.summary if analysis else _payload_summary(payload),
                    resume_technologies=_technologies(analysis, payload),
                    resume_payload=payload,
                )
            )
        return results


def payload_title(payload: dict, fallback: str) -> str:
    title = payload.get("title") if isinstance(payload, dict) else None
    return title if isinstance(title, str) and title.strip() else fallback


def _payload_summary(payload: dict) -> str | None:
    for key in ("summary", "about"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _technologies(analysis, payload: dict) -> list[str]:
    if analysis is not None and analysis.technologies:
        return [str(item) for item in analysis.technologies]
    raw = payload.get("technologies") or payload.get("skills") or []
    if not isinstance(raw, list):
        return []
    return [str(item) for item in raw if isinstance(item, str)]
