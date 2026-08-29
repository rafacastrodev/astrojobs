import logging
from dataclasses import dataclass, field, replace

from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository
from domain.documents.semantic_matcher import SemanticMatcher
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase
from domain.documents.use_cases.match_resumes_for_jobs import (
    _combined_match_score,
    _job_technologies,
    _normalize,
    _passes_filters,
    _resume_technologies,
    apply_title_score,
    overlay_user_profile,
)
from domain.users.repository import UserRepository

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
MAX_TOP_K = 50


@dataclass
class JobMatch:
    document: DocumentEntity
    score: float
    matched_technologies: list[str] = field(default_factory=list)


class MatchJobsForResumeUseCase:
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
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self, resume_document_id: int, user_id: int, top_k: int = DEFAULT_TOP_K
    ) -> list[JobMatch]:
        matches = [
            match
            for match in self.execute_for_resume(resume_document_id, user_id)
            if match.score > 0
        ]
        limit = max(1, min(top_k, MAX_TOP_K))
        return matches[:limit]

    def execute_for_resume(
        self, resume_document_id: int, user_id: int
    ) -> list[JobMatch]:
        resume = self._get_resume.execute(resume_document_id, user_id)
        analysis = self._analyses.get_latest_general(resume_document_id, user_id)
        return self._score_jobs(resume, analysis)

    def execute_for_user(self, user_id: int) -> list[JobMatch]:
        jobs = [
            job for job in self._documents.list(doc_type="job") if _is_open_job(job)
        ]
        resumes = [
            resume
            for resume in self._documents.list_by_user(user_id, doc_type="resume")
            if resume.id is not None
        ]
        if not resumes:
            return [JobMatch(document=job, score=0.0) for job in jobs]

        best: dict[int, JobMatch] = {}
        analyses = self._analyses.list_latest_general_by_resume_ids(
            [resume.id for resume in resumes if resume.id is not None]
        )
        for resume in resumes:
            if resume.id is None:
                continue
            for match in self._score_jobs(resume, analyses.get(resume.id)):
                current = best.get(match.document.id)  # type: ignore[arg-type]
                if current is None or match.score > current.score:
                    best[match.document.id] = match  # type: ignore[index]
        ranked = list(best.values())
        ranked.sort(
            key=lambda item: (
                item.score,
                item.document.created_at,
                len(item.matched_technologies),
            ),
            reverse=True,
        )
        return ranked

    def _score_jobs(self, resume: DocumentEntity, analysis) -> list[JobMatch]:
        user = (
            self._users.get_by_id(resume.user_id)
            if self._users is not None and resume.user_id is not None
            else None
        )
        resume = replace(resume, payload=overlay_user_profile(resume.payload, user))
        resume_labels = {
            _normalize(tech): tech
            for tech in _resume_technologies(resume.payload, analysis)
            if _normalize(tech)
        }
        jobs = [
            job for job in self._documents.list(doc_type="job") if _is_open_job(job)
        ]
        semantic_scores = (
            self._semantic.rank(resume.payload, "resume", jobs)
            if self._semantic is not None
            else {}
        )
        matches: list[JobMatch] = []
        for job in jobs:
            job_labels = {
                _normalize(tech): tech
                for tech in _job_technologies(job.payload)
                if _normalize(tech)
            }
            overlap = set(job_labels) & set(resume_labels)
            technology_score = len(overlap) / len(job_labels) if job_labels else 0.0
            score = _combined_match_score(
                technology_score,
                semantic_scores.get(job.id, 0.0),
                has_required_technologies=bool(job_labels),
            )
            compatible = _passes_filters(job.payload, resume.payload, analysis)
            if compatible:
                score = apply_title_score(score, job.payload, resume.payload)
            else:
                score = 0.0
            matches.append(
                JobMatch(
                    document=job,
                    score=score,
                    matched_technologies=[job_labels[key] for key in sorted(overlap)],
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


def _is_open_job(job: DocumentEntity) -> bool:
    return (
        job.id is not None
        and job.user_id is not None
        and job.status == "synced"
        and job.closed_at is None
    )
