from collections.abc import Sequence

from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository


class ListUserResumesUseCase:
    def __init__(self, document_repository: DocumentRepository):
        self._documents = document_repository

    def execute(self, user_id: int) -> Sequence[DocumentEntity]:
        return self._documents.list_by_user(user_id, doc_type="resume")
