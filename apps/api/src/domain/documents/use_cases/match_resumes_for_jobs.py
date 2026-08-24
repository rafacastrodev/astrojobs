from dataclasses import dataclass, replace
from typing import Any

from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.region_catalog import canonical_region, regions_compatible
from domain.documents.repository import DocumentRepository
from domain.documents.semantic_matcher import SemanticMatcher
from domain.documents.technology_catalog import (
    canonical_technology,
    technologies_in_text,
)
from domain.users.entities import UserEntity
from domain.users.repository import UserRepository

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
    matched_job_scores: dict[int, float]
    summary: str | None = None


def _normalize(value: str) -> str:
    canonical = canonical_technology(value) or value
    return " ".join(canonical.casefold().split())


def _as_techs(value: Any) -> list[str]:
    if isinstance(value, str):
        return [
            part.strip()
            for part in value.replace(",", "\n").splitlines()
            if part.strip()
        ]
    if isinstance(value, (list, tuple)):
        items: list[str] = []
        for item in value:
            items.extend(_as_techs(item))
        return items
    if isinstance(value, dict):
        items: list[str] = []
        for item in value.values():
            items.extend(_as_techs(item))
        return items
    return []


def _job_technologies(payload: dict[str, Any]) -> list[str]:
    return _as_techs(payload.get("technologies"))


def _resume_technologies(
    payload: dict[str, Any], analysis: AnalysisEntity | None
) -> list[str]:
    techs = _as_techs(payload.get("technologies"))
    techs.extend(_as_techs(payload.get("skills")))
    stack = payload.get("tech_stack")
    if isinstance(stack, dict):
        techs.extend(_as_techs(list(stack.values())))
    if analysis is not None:
        techs.extend(analysis.technologies)
    techs.extend(technologies_in_text(_payload_text(payload)))
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


def _resume_seniority(
    payload: dict[str, Any], analysis: AnalysisEntity | None
) -> str | None:
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


def _passes_seniority(
    job: dict[str, Any], resume: dict[str, Any], analysis: AnalysisEntity | None
) -> bool:
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
    preference = resume.get("preferred_work_mode") or resume.get("work_mode")
    if not isinstance(preference, str) or not preference.strip():
        return True
    normalized = _normalize(preference)
    return wanted == normalized or _mentions(normalized, WORK_MODE_ALIASES[wanted])


def overlay_user_profile(
    payload: dict[str, Any], user: UserEntity | None
) -> dict[str, Any]:
    if user is None:
        return payload
    merged = dict(payload)
    if user.region:
        merged["region"] = user.region
    if user.job_title:
        merged["job_title"] = user.job_title
    if user.company:
        merged["company"] = user.company
    if user.salary_min_usd is not None:
        merged["salary_min_usd"] = user.salary_min_usd
    if user.salary_max_usd is not None:
        merged["salary_max_usd"] = user.salary_max_usd
    return merged


def _salary_bounds(payload: dict[str, Any]) -> tuple[int, int] | None:
    raw_min = payload.get("salary_min_usd")
    raw_max = payload.get("salary_max_usd")
    low = raw_min if isinstance(raw_min, int) else None
    high = raw_max if isinstance(raw_max, int) else None
    if low is None and high is None:
        return None
    if low is None:
        low = high
    if high is None:
        high = low
    if low is None or high is None:
        return None
    return (min(low, high), max(low, high))


def _passes_salary(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    job_range = _salary_bounds(job)
    resume_range = _salary_bounds(resume)
    if job_range is None or resume_range is None:
        return True
    return job_range[0] <= resume_range[1] and resume_range[0] <= job_range[1]


def _candidate_titles(payload: dict[str, Any]) -> list[str]:
    titles: list[str] = []
    for key in ("job_title", "title", "headline"):
        titles.extend(_as_techs(payload.get(key)))
    experiences = payload.get("experiences")
    if isinstance(experiences, list):
        for item in experiences:
            if isinstance(item, dict):
                titles.extend(_as_techs(item.get("job_title") or item.get("title")))
    return [title for title in titles if title]


def _title_similarity(job: dict[str, Any], resume: dict[str, Any]) -> float:
    job_title = job.get("title")
    if not isinstance(job_title, str) or not job_title.strip():
        return 0.0
    job_tokens = set(_normalize(job_title).split())
    if not job_tokens:
        return 0.0
    best = 0.0
    for title in _candidate_titles(resume):
        tokens = set(_normalize(title).split())
        if not tokens:
            continue
        best = max(best, len(job_tokens & tokens) / len(job_tokens | tokens))
    return best


def apply_title_score(
    score: float, job: dict[str, Any], resume: dict[str, Any]
) -> float:
    similarity = _title_similarity(job, resume)
    if similarity > 0:
        return min(1.0, score + 0.15 * similarity)
    if _candidate_titles(resume):
        return score * 0.85
    return score


def _passes_region(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    wanted = job.get("region")
    if not isinstance(wanted, str) or not wanted.strip():
        return True
    if job.get("work_mode") == "remote":
        return True
    if canonical_region(wanted) == "Remote / Worldwide":
        return True
    locations = _resume_locations(resume)
    if not locations:
        return True
    if any(regions_compatible(wanted, location) for location in locations):
        return True
    needle = _normalize(wanted)
    return any(needle in location or location in needle for location in locations)


def _passes_employment(job: dict[str, Any], resume: dict[str, Any]) -> bool:
    wanted = job.get("employment_type")
    if not isinstance(wanted, str) or wanted not in EMPLOYMENT_ALIASES:
        return True
    preference = resume.get("preferred_employment_type") or resume.get(
        "employment_type"
    )
    if not isinstance(preference, str) or not preference.strip():
        return True
    normalized = _normalize(preference)
    return wanted == normalized or _mentions(normalized, EMPLOYMENT_ALIASES[wanted])


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
        and _passes_salary(job, resume)
    )


def _combined_match_score(
    technology_score: float,
    semantic_score: float,
    *,
    has_required_technologies: bool,
) -> float:
    """Preserve exact skill coverage and let semantic relevance lift near matches."""
    technology_score = max(0.0, min(1.0, technology_score))
    semantic_score = max(0.0, min(1.0, semantic_score))
    if not has_required_technologies:
        return semantic_score
    return technology_score + ((1.0 - technology_score) * semantic_score * 0.35)


class MatchResumesForJobsUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        analysis_repository: AnalysisRepository,
        semantic_matcher: SemanticMatcher | None = None,
        user_repository: UserRepository | None = None,
    ):
        self._documents = document_repository
        self._analyses = analysis_repository
        self._semantic = semantic_matcher
        self._users = user_repository

    def execute(self, recruiter_id: int) -> list[ResumeMatch]:
        jobs = [
            job
            for job in self._documents.list(doc_type="job")
            if (
                job.id is not None
                and job.user_id == recruiter_id
                and job.status == "synced"
                and job.closed_at is None
            )
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
        resumes = [
            replace(
                resume,
                payload=overlay_user_profile(
                    resume.payload,
                    self._users.get_by_id(resume.user_id)
                    if self._users is not None and resume.user_id is not None
                    else None,
                ),
            )
            for resume in self._documents.list(doc_type="resume")
            if resume.id is not None and resume.user_id is not None
        ]
        analyses = self._analyses.list_latest_general_by_resume_ids(
            [resume.id for resume in resumes if resume.id is not None]
        )
        semantic_scores_by_job = {
            job.id: self._semantic.rank(job.payload, "job", resumes)
            for job in jobs
            if job.id is not None and self._semantic is not None
        }

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
            matched_jobs: list[DocumentEntity] = []
            matched_job_scores: dict[int, float] = {}
            matched_keys: dict[str, str] = {}
            best_ratio = 0.0
            for job in jobs:
                if job.id is None:
                    continue
                labels = job_techs.get(job.id, {})
                overlap = set(labels) & set(resume_labels)
                technology_score = len(overlap) / len(labels) if labels else 0.0
                score = _combined_match_score(
                    technology_score,
                    semantic_scores_by_job.get(job.id, {}).get(resume.id, 0.0),
                    has_required_technologies=bool(labels),
                )
                if score <= 0:
                    continue
                if not _passes_filters(job.payload, resume.payload, analysis):
                    continue
                score = apply_title_score(score, job.payload, resume.payload)
                matched_jobs.append(job)
                matched_job_scores[job.id] = score
                for key in overlap:
                    matched_keys.setdefault(key, labels[key])
                best_ratio = max(best_ratio, score)
            if not matched_jobs:
                continue
            matches.append(
                ResumeMatch(
                    document=resume,
                    score=best_ratio,
                    matched_technologies=[
                        matched_keys[key] for key in sorted(matched_keys)
                    ],
                    matched_jobs=matched_jobs,
                    matched_job_scores=matched_job_scores,
                    summary=analysis.summary if analysis else None,
                )
            )

        matches.sort(
            key=lambda item: (
                item.score,
                item.document.created_at,
                len(item.matched_technologies),
            ),
            reverse=True,
        )
        return matches
