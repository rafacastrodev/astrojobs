from dataclasses import dataclass
from typing import Any

from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository

SENIORITY_RANK = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "senior": 3,
    "lead": 4,
    "principal": 5,
    "staff": 5,
}

WORK_MODE_ALIASES = {
    "remote": ("remote", "remoto", "work from home", "wfh"),
    "hybrid": ("hybrid", "hibrido", "híbrido"),
    "on-site": ("on-site", "onsite", "on site", "presencial", "office"),
}

EMPLOYMENT_ALIASES = {
    "full-time": ("full-time", "full time", "clt", "efetivo"),
    "part-time": ("part-time", "part time", "meio periodo", "meio período"),
    "contract": ("contract", "pj", "contractor", "freelance"),
    "internship": ("internship", "intern", "estagio", "estágio"),
    "temporary": ("temporary", "temporario", "temporário"),
}


@dataclass
class ResumeMatch:
    document: DocumentEntity
    score: float
    matched_technologies: list[str]
    matched_jobs: list[DocumentEntity]
    summary: str | None = None


def _normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def _as_techs(value: Any) -> list[str]:
    if isinstance(value, str):
        return [part.strip() for part in value.replace(",", "\n").splitlines() if part.strip()]
    if isinstance(value, (list, tuple)):
        items: list[str] = []
        for item in value:
            items.extend(_as_techs(item))
        return items
    return []


def _job_technologies(payload: dict[str, Any]) -> list[str]:
    return _as_techs(payload.get("technologies"))


def _resume_technologies(payload: dict[str, Any], analysis: AnalysisEntity | None) -> list[str]:
    techs = _as_techs(payload.get("technologies"))
    techs.extend(_as_techs(payload.get("skills")))
    if analysis is not None:
        techs.extend(analysis.technologies)
    return techs


def _resume_text(payload: dict[str, Any]) -> str:
    return _normalize(_payload_text(payload))


def _payload_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return " ".join(_payload_text(item) for item in value)
    if isinstance(value, dict):
        return " ".join(_payload_text(item) for item in value.values())
    return ""


def _resume_locations(payload: dict[str, Any]) -> list[str]:
    locations: list[str] = []
    for key in ("location", "region", "city"):
        locations.extend(_as_techs(payload.get(key)))
    experiences = payload.get("experiences")
    if isinstance(experiences, list):
        for item in experiences:
            if isinstance(item, dict):
                locations.extend(_as_techs(item.get("location")))
    return [_normalize(item) for item in locations if _normalize(item)]


def _seniority_from_years(years: float | None) -> str | None:
    if years is None:
        return None
    if years < 1:
        return "intern"
    if years < 3:
        return "junior"
    if years < 6:
        return "mid"
    if years < 9:
        return "senior"
    return "lead"


def _resume_seniority(payload: dict[str, Any], analysis: AnalysisEntity | None) -> str | None:
    raw = payload.get("seniority")
    if isinstance(raw, str) and _normalize(raw) in SENIORITY_RANK:
        return _normalize(raw)
    years = analysis.years_of_experience if analysis is not None else None
    if years is None:
        raw_years = payload.get("years_of_experience")
        if isinstance(raw_years, (int, float)):
            years = float(raw_years)
    inferred = _seniority_from_years(years)
    if inferred:
        return inferred
    text = _resume_text(payload)
    for label in ("principal", "staff", "lead", "senior", "junior", "intern", "mid"):
        if label in text:
            return label
    return None


def _mentions(text: str, aliases: tuple[str, ...]) -> bool:
    return any(alias in text for alias in aliases)


def _passes_seniority(job: dict[str, Any], resume: dict[str, Any], analysis: AnalysisEntity | None) -> bool:
    wanted = job.get("seniority")
    if not isinstance(wanted, str) or wanted not in SENIORITY_RANK:
        return True
    inferred = _resume_seniority(resume, analysis)
    if inferred is None:
        return True
    return abs(SENIORITY_RANK[inferred] - SENIORITY_RANK[wanted]) <= 1


def _passes_work_mode(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    wanted = job.get("work_mode")
    if not isinstance(wanted, str) or wanted not in WORK_MODE_ALIASES:
        return True
    text = _resume_text(resume)
    mentioned = {
        mode for mode, aliases in WORK_MODE_ALIASES.items() if _mentions(text, aliases)
    }
    if not mentioned:
        return True
    return wanted in mentioned


def _passes_region(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    wanted = job.get("region")
    if not isinstance(wanted, str) or not wanted.strip():
        return True
    if job.get("work_mode") == "remote":
        return True
    needle = _normalize(wanted)
    locations = _resume_locations(resume)
    if not locations:
        return True
    return any(needle in location or location in needle for location in locations)


def _passes_employment(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    wanted = job.get("employment_type")
    if not isinstance(wanted, str) or wanted not in EMPLOYMENT_ALIASES:
        return True
    text = _resume_text(resume)
    mentioned = {
        mode for mode, aliases in EMPLOYMENT_ALIASES.items() if _mentions(text, aliases)
    }
    if not mentioned:
        return True
    return wanted in mentioned


def _passes_filters(
    job: dict[str, Any],
    resume: dict[str, Any],
    analysis: AnalysisEntity | None,
) -> bool:
    return (
        _passes_seniority(job, resume, analysis)
        and _passes_work_mode(job, resume)
        and _passes_region(job, resume)
        and _passes_employment(job, resume)
    )


class MatchResumesForJobsUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        analysis_repository: AnalysisRepository,
    ):
        self._documents = document_repository
        self._analyses = analysis_repository

    def execute(self, recruiter_id: int) -> list[ResumeMatch]:
        jobs = [
            job
            for job in self._documents.list(doc_type="job")
            if job.id is not None and job.user_id in (None, recruiter_id)
        ]
        if not jobs:
            return []

        job_techs: dict[int, dict[str, str]] = {}
        for job in jobs:
            labels = {
                _normalize(tech): tech
                for tech in _job_technologies(job.payload)
                if _normalize(tech)
            }
            if labels and job.id is not None:
                job_techs[job.id] = labels
        if not job_techs:
            return []

        resumes = [
            resume
            for resume in self._documents.list(doc_type="resume")
            if resume.id is not None and resume.user_id is not None
        ]
        analyses = self._analyses.list_latest_general_by_resume_ids(
            [resume.id for resume in resumes if resume.id is not None]
        )

        matches: list[ResumeMatch] = []
        for resume in resumes:
            if resume.id is None:
                continue
            analysis = analyses.get(resume.id)
            resume_labels = {
                _normalize(tech): tech
                for tech in _resume_technologies(resume.payload, analysis)
                if _normalize(tech)
            }
            if not resume_labels:
                continue
            matched_jobs: list[DocumentEntity] = []
            matched_keys: dict[str, str] = {}
            best_ratio = 0.0
            for job in jobs:
                if job.id not in job_techs:
                    continue
                overlap = set(job_techs[job.id]) & set(resume_labels)
                if not overlap:
                    continue
                if not _passes_filters(job.payload, resume.payload, analysis):
                    continue
                matched_jobs.append(job)
                for key in overlap:
                    matched_keys.setdefault(key, job_techs[job.id][key])
                best_ratio = max(best_ratio, len(overlap) / len(job_techs[job.id]))
            if not matched_jobs:
                continue
            matches.append(
                ResumeMatch(
                    document=resume,
                    score=best_ratio,
                    matched_technologies=[matched_keys[key] for key in sorted(matched_keys)],
                    matched_jobs=matched_jobs,
                    summary=analysis.summary if analysis else None,
                )
            )

        matches.sort(
            key=lambda item: (item.score, len(item.matched_technologies)),
            reverse=True,
        )
        return matches
