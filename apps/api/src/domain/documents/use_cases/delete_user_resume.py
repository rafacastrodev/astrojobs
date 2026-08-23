import logging
from collections.abc import Callable

from domain.documents.errors import DocumentNotFoundError
from domain.documents.file_storage import FileStoragePort
from domain.documents.pinecone_client import PineconeClientPort
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase

logger = logging.getLogger(__name__)


class DeleteUserResumeUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        file_storage: FileStoragePort,
        pinecone_client_factory: Callable[[], PineconeClientPort],
        namespace_resumes: str,
    ):
        self._documents = document_repository
        self._storage = file_storage
        self._pinecone_factory = pinecone_client_factory
        self._namespace_resumes = namespace_resumes
        self._get = GetUserResumeUseCase(document_repository)

    def execute(self, document_id: int, user_id: int) -> None:
        document = self._get.execute(document_id, user_id)

        if not self._documents.delete(document_id):
            raise DocumentNotFoundError(f"Document {document_id} not found")

        if document.storage_key:
            try:
                self._storage.delete(document.storage_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete stored object %s: %s", document.storage_key, exc
                )
            try:
                self._storage.delete(f"{document.storage_key}.metadata.json")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete legacy metadata sidecar for %s: %s",
                    document.storage_key,
                    exc,
                )

        if document.pinecone_id:
            try:
                self._pinecone_factory().delete([document.pinecone_id], self._namespace_resumes)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete Pinecone vector %s: %s", document.pinecone_id, exc
                )
