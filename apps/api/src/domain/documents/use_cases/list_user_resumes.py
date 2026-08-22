from collections.abc import Sequence

from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository


class ListUserResumesUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        analysis_repository: AnalysisRepository,
    ):
        self._documents = document_repository
        self._analyses = analysis_repository

    def execute(
        self, user_id: int
    ) -> Sequence[tuple[DocumentEntity, AnalysisEntity | None]]:
        documents = self._documents.list_by_user(user_id, doc_type="resume")
        return [
            (document, self._analyses.get_latest_general(document.id, user_id))  # type: ignore[arg-type]
            for document in documents
        ]
