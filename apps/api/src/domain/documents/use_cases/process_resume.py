import logging

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalyzerError
from domain.analysis.repository import AnalysisRepository
from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.documents.entities import DocumentEntity
from domain.documents.errors import SyncConfigurationError
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase

logger = logging.getLogger(__name__)


class ProcessResumeUseCase:
    """Retries only unfinished resume processing unless analysis is forced."""

    def __init__(
        self,
        documents: DocumentRepository,
        analyses: AnalysisRepository,
        analyze_resume: AnalyzeResumeUseCase,
        sync_documents: SyncDocumentsUseCase,
    ) -> None:
        self._documents = documents
        self._analyses = analyses
        self._analyze_resume = analyze_resume
        self._sync_documents = sync_documents
        self._get_resume = GetUserResumeUseCase(documents)

    def execute(
        self, document_id: int, user_id: int, force_analysis: bool = False
    ) -> tuple[DocumentEntity, AnalysisEntity | None]:
        resume = self._get_resume.execute(document_id, user_id)
        analysis = self._analyses.get_latest_general(document_id, user_id)

        if force_analysis or resume.analysis_status != "completed" or analysis is None:
            try:
                analysis = self._analyze_resume.execute(
                    user_id=user_id,
                    resume_document_id=document_id,
                    job_source="none",
                )
            except AnalyzerError as exc:
                logger.warning("Retry analysis failed for document %s: %s", document_id, exc)

        resume = self._get_resume.execute(document_id, user_id)
        if resume.status != "synced":
            try:
                self._sync_documents.execute([document_id])
            except SyncConfigurationError as exc:
                self._documents.mark_failed(document_id, str(exc))
            except Exception:
                logger.exception("Retry indexing failed for document %s", document_id)
                self._documents.mark_failed(
                    document_id, "Resume indexing is temporarily unavailable"
                )

        return self._get_resume.execute(document_id, user_id), analysis
