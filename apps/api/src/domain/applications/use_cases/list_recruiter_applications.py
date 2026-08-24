import re
from collections.abc import Sequence
from typing import Any

from domain.analysis.repository import AnalysisRepository
from domain.applications.entities import RecruiterApplication
from domain.applications.repository import ApplicationRepository
from domain.documents.experience_grouping import grouped_resume_payload
from domain.documents.repository import DocumentRepository
from domain.users.repository import UserRepository

_NAME_BLOCKLIST = {
    "about",
    "summary",
    "experience",
    "education",
    "skills",
    "profile",
    "objective",
    "resume",
    "curriculum",
    "contato",
    "contact",
}


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

    def execute(
        self, recruiter_user_id: int, job_document_id: int | None = None
    ) -> Sequence[RecruiterApplication]:
        applications = self._applications.list_by_recruiter(recruiter_user_id)
        if job_document_id is not None:
            applications = [
                application
                for application in applications
                if application.job_document_id == job_document_id
            ]
        resume_ids = [application.resume_document_id for application in applications]
        analyses = self._analyses.list_latest_general_by_resume_ids(resume_ids)
        results: list[RecruiterApplication] = []
        for application in applications:
            job = self._documents.get_by_id(application.job_document_id)
            resume = self._documents.get_by_id(application.resume_document_id)
            applicant = self._users.get_by_id(application.applicant_user_id)
            if job is None or resume is None or applicant is None:
                continue
            analysis = analyses.get(resume.id) if resume.id is not None else None
            payload = grouped_resume_payload(
                resume.payload if isinstance(resume.payload, dict) else {}
            )
            job_payload = job.payload if isinstance(job.payload, dict) else {}
            title = payload_title(job_payload, job.source_filename)
            technologies = _technologies(analysis, payload)
            results.append(
                RecruiterApplication(
                    id=application.id,
                    created_at=application.created_at,
                    job_document_id=application.job_document_id,
                    job_title=title,
                    applicant_name=_applicant_display_name(payload, applicant.name),
                    applicant_email=applicant.email,
                    resume_document_id=application.resume_document_id,
                    resume_filename=resume.source_filename,
                    resume_summary=analysis.summary
                    if analysis
                    else _payload_summary(payload),
                    resume_technologies=technologies,
                    matched_technologies=_matched_technologies(
                        job_payload, payload, technologies
                    ),
                    resume_payload=_with_account_email(payload, applicant.email),
                    status=application.status,
                    updated_at=application.updated_at,
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
    values: list[str] = []
    if analysis is not None and analysis.technologies:
        values.extend(str(item) for item in analysis.technologies)
    raw = payload.get("technologies") or payload.get("skills") or []
    if isinstance(raw, list):
        values.extend(str(item) for item in raw if isinstance(item, str))
    stack = payload.get("tech_stack")
    if isinstance(stack, dict):
        for group in stack.values():
            if isinstance(group, list):
                values.extend(str(item) for item in group if isinstance(item, str))
    return list(dict.fromkeys(values))


def _applicant_display_name(payload: dict, fallback: str) -> str:
    for key in ("full_name", "name"):
        value = payload.get(key)
        if isinstance(value, str) and _looks_like_name(value.strip()):
            return value.strip()
    full_text = payload.get("full_text")
    if isinstance(full_text, str):
        first_line = next(
            (line.strip() for line in full_text.splitlines() if line.strip()),
            "",
        )
        if _looks_like_name(first_line):
            return first_line
    return fallback


def _looks_like_name(value: str) -> bool:
    if not value or "@" in value or "http" in value.casefold() or len(value) > 80:
        return False
    words = value.split()
    if not 1 <= len(words) <= 6:
        return False
    if any(character.isdigit() for character in value):
        return False
    return value.casefold() not in _NAME_BLOCKLIST


def _with_account_email(payload: dict, email: str) -> dict[str, Any]:
    result = dict(payload)
    contact = result.get("contact")
    contact = dict(contact) if isinstance(contact, dict) else {}
    emails = [
        str(item)
        for item in contact.get("emails", [])
        if isinstance(item, str) and item.strip()
    ]
    if email and email not in emails:
        emails.insert(0, email)
    contact["emails"] = emails
    result["contact"] = contact
    return result


def _normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def _payload_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return " ".join(_payload_text(item) for item in value)
    if isinstance(value, dict):
        return " ".join(_payload_text(item) for item in value.values())
    return ""


def _contains_tech(text: str, tech: str) -> bool:
    pattern = r"(?<!\w)" + re.escape(tech) + r"(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def _job_technologies(payload: dict) -> list[str]:
    raw = payload.get("technologies") or []
    if isinstance(raw, str):
        return [
            part.strip() for part in raw.replace(",", "\n").splitlines() if part.strip()
        ]
    if not isinstance(raw, list):
        return []
    return [str(item) for item in raw if isinstance(item, str) and item.strip()]


def _matched_technologies(
    job_payload: dict, resume_payload: dict, resume_technologies: list[str]
) -> list[str]:
    resume_keys = {_normalize(item) for item in resume_technologies if _normalize(item)}
    resume_text = _payload_text(resume_payload)
    matched: list[str] = []
    seen: set[str] = set()
    for tech in _job_technologies(job_payload):
        key = _normalize(tech)
        if not key or key in seen:
            continue
        if key in resume_keys or _contains_tech(resume_text, tech):
            seen.add(key)
            matched.append(tech)
    return matched
