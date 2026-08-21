import logging

from domain.analysis.analyzer import ResumeAnalyzer
from domain.analysis.entities import AnalysisEntity, JobSource
from domain.analysis.errors import AnalyzerError, InvalidJobSourceError
from domain.analysis.repository import AnalysisRepository
from domain.documents.errors import DocumentNotFoundError
from domain.documents.repository import DocumentRepository
from domain.documents.text_extractor import TextExtractor
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase

logger = logging.getLogger(__name__)

MAX_PASTED_JOB_TEXT_CHARS = 20_000


class AnalyzeResumeUseCase:
    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        document_repository: DocumentRepository,
        analyzer: ResumeAnalyzer,
        extractor: TextExtractor,
    ):
        self._analyses = analysis_repository
        self._documents = document_repository
        self._analyzer = analyzer
        self._extractor = extractor
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self,
        user_id: int,
        resume_document_id: int,
        job_source: JobSource,
        job_document_id: int | None = None,
        job_text: str | None = None,
    ) -> AnalysisEntity:
        resume = self._get_resume.execute(resume_document_id, user_id)

        job_payload, resolved_job_document_id, job_title = self._resolve_job(
            job_source, job_document_id, job_text
        )

        try:
            result = self._analyzer.analyze(resume.payload, job_payload)
        except AnalyzerError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Resume analysis failed for document %s: %s", resume_document_id, exc
            )
            raise AnalyzerError(str(exc)) from exc

        return self._analyses.create(
            user_id=user_id,
            resume_document_id=resume_document_id,
            job_source=job_source,
            job_document_id=resolved_job_document_id,
            job_title=job_title,
            score=result["score"],
            summary=result["summary"],
            findings=result["findings"],
        )

    def _resolve_job(
        self,
        job_source: JobSource,
        job_document_id: int | None,
        job_text: str | None,
    ) -> tuple[dict | None, int | None, str | None]:
        if job_source == "none":
            return None, None, None

        if job_source == "catalog":
            if job_document_id is None:
                raise InvalidJobSourceError(
                    "job_document_id is required when job_source is 'catalog'"
                )
            job = self._documents.get_by_id(job_document_id)
            if job is None or job.type != "job":
                raise DocumentNotFoundError(f"Job document {job_document_id} not found")
            title = job.payload.get("title") if isinstance(job.payload, dict) else None
            return job.payload, job.id, title

        if job_source == "pasted":
            if not job_text or not job_text.strip():
                raise InvalidJobSourceError(
                    "job_text is required when job_source is 'pasted'"
                )
            if len(job_text) > MAX_PASTED_JOB_TEXT_CHARS:
                raise InvalidJobSourceError(
                    f"job_text is longer than the {MAX_PASTED_JOB_TEXT_CHARS} character limit"
                )
            try:
                payload = self._extractor.extract(job_text, "job")
            except ValueError as exc:
                raise InvalidJobSourceError(str(exc)) from exc
            title = payload.get("title") if isinstance(payload, dict) else None
            return payload, None, title

        raise InvalidJobSourceError(f"Unknown job_source '{job_source}'")
