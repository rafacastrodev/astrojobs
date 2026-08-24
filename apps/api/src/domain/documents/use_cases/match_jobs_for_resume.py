import logging
from dataclasses import dataclass, field

from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase
from domain.documents.use_cases.match_resumes_for_jobs import (
    _job_technologies,
    _normalize,
    _passes_filters,
    _resume_technologies,
)

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
    ):
        self._documents = document_repository
        self._analyses = analysis_repository
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self, resume_document_id: int, user_id: int, top_k: int = DEFAULT_TOP_K
    ) -> list[JobMatch]:
        resume = self._get_resume.execute(resume_document_id, user_id)
        analysis = self._analyses.get_latest_general(resume_document_id, user_id)
        matches = [
            match
            for match in self._score_jobs(resume, analysis)
            if match.score > 0
        ]
        limit = max(1, min(top_k, MAX_TOP_K))
        return matches[:limit]

    def execute_for_user(self, user_id: int) -> list[JobMatch]:
        jobs = [job for job in self._documents.list(doc_type="job") if job.id is not None]
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
            key=lambda item: (item.score, len(item.matched_technologies)),
            reverse=True,
        )
        return ranked

    def _score_jobs(
        self, resume: DocumentEntity, analysis
    ) -> list[JobMatch]:
        resume_labels = {
            _normalize(tech): tech
            for tech in _resume_technologies(resume.payload, analysis)
            if _normalize(tech)
        }
        matches: list[JobMatch] = []
        for job in self._documents.list(doc_type="job"):
            if job.id is None:
                continue
            job_labels = {
                _normalize(tech): tech
                for tech in _job_technologies(job.payload)
                if _normalize(tech)
            }
            overlap = set(job_labels) & set(resume_labels)
            score = len(overlap) / len(job_labels) if job_labels else 0.0
            if resume_labels and job_labels and not _passes_filters(
                job.payload, resume.payload, analysis
            ):
                score *= 0.5
            matches.append(
                JobMatch(
                    document=job,
                    score=score,
                    matched_technologies=[job_labels[key] for key in sorted(overlap)],
                )
            )
        matches.sort(
            key=lambda item: (item.score, len(item.matched_technologies)),
            reverse=True,
        )
        return matches
