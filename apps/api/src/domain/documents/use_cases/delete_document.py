from collections.abc import Callable

from domain.documents.entities import DocumentType
from domain.documents.errors import DocumentNotFoundError
from domain.documents.pinecone_client import PineconeClientPort
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_document import GetDocumentUseCase


class DeleteDocumentUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        pinecone_client_factory: Callable[[], PineconeClientPort],
        namespace_resumes: str,
        namespace_jobs: str,
    ):
        self._documents = document_repository
        self._pinecone_factory = pinecone_client_factory
        self._namespace_resumes = namespace_resumes
        self._namespace_jobs = namespace_jobs
        self._get = GetDocumentUseCase(document_repository)

    def execute(self, document_id: int) -> None:
        document = self._get.execute(document_id)
        deleted = self._documents.delete(document_id)
        if not deleted:
            raise DocumentNotFoundError(f"Document {document_id} not found")
        if document.pinecone_id:
            try:
                client = self._pinecone_factory()
                client.delete([document.pinecone_id], self._namespace_for(document.type))
            except Exception:
                pass

    def _namespace_for(self, doc_type: DocumentType) -> str:
        if doc_type == "resume":
            return self._namespace_resumes
        return self._namespace_jobs
