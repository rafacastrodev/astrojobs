from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase


class GetUserResumeDetailUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        analysis_repository: AnalysisRepository,
    ):
        self._get_resume = GetUserResumeUseCase(document_repository)
        self._analyses = analysis_repository

    def execute(
        self, document_id: int, user_id: int
    ) -> tuple[DocumentEntity, AnalysisEntity | None]:
        document = self._get_resume.execute(document_id, user_id)
        analysis = self._analyses.get_latest_general(document_id, user_id)
        return document, analysis
