import logging

from domain.documents.entities import DocumentEntity
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase

logger = logging.getLogger(__name__)


class CreateJobUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        sync_documents_use_case: SyncDocumentsUseCase,
    ):
        self._documents = document_repository
        self._sync = sync_documents_use_case

    def execute(self, payload: dict) -> DocumentEntity:
        document = self._documents.create("job", payload, "admin-form")
        try:
            self._sync.execute([document.id])  # type: ignore[list-item]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Initial job indexing failed for document %s: %s", document.id, exc)
            self._documents.mark_failed(document.id, "Could not index job")  # type: ignore[arg-type]
        return self._documents.get_by_id(document.id) or document  # type: ignore[arg-type]
