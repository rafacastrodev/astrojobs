from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.documents.repository import DocumentRepository


class GetDocumentUseCase:
    def __init__(self, document_repository: DocumentRepository):
        self._documents = document_repository

    def execute(self, document_id: int) -> DocumentEntity:
        document = self._documents.get_by_id(document_id)
        if document is None:
            raise DocumentNotFoundError(f"Document {document_id} not found")
        return document
