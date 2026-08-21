from collections.abc import Sequence

from domain.documents.entities import DocumentEntity, DocumentStatus, DocumentType
from domain.documents.repository import DocumentRepository


class ListDocumentsUseCase:
    def __init__(self, document_repository: DocumentRepository):
        self._documents = document_repository

    def execute(
        self,
        doc_type: DocumentType | None = None,
        status: DocumentStatus | None = None,
    ) -> Sequence[DocumentEntity]:
        return self._documents.list(doc_type=doc_type, status=status)
