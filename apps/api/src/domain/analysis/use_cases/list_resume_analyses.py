from collections.abc import Sequence

from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase


class ListResumeAnalysesUseCase:
    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        document_repository: DocumentRepository,
    ):
        self._analyses = analysis_repository
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]:
        self._get_resume.execute(resume_document_id, user_id)
        return self._analyses.list_by_resume(resume_document_id, user_id)
