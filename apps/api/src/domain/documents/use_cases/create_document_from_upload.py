import logging

from domain.documents.entities import DocumentEntity, DocumentType
from domain.documents.errors import ExtractionError, UnsupportedFileError
from domain.documents.file_text_loader import FileTextLoader
from domain.documents.repository import DocumentRepository
from domain.documents.text_extractor import TextExtractor
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase

logger = logging.getLogger(__name__)


class CreateDocumentFromUploadUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        file_loader: FileTextLoader,
        extractor: TextExtractor,
        sync_documents_use_case: SyncDocumentsUseCase,
    ):
        self._documents = document_repository
        self._file_loader = file_loader
        self._extractor = extractor
        self._sync = sync_documents_use_case

    def execute(
        self,
        content: bytes,
        filename: str,
        doc_type: DocumentType,
        user_id: int,
    ) -> DocumentEntity:
        try:
            text = self._file_loader.load(content, filename)
        except UnsupportedFileError:
            raise
        except Exception as exc:
            raise UnsupportedFileError(str(exc)) from exc

        try:
            payload = self._extractor.extract(text, doc_type)
        except Exception as exc:
            raise ExtractionError(str(exc)) from exc

        if not payload:
            raise ExtractionError("Extractor returned an empty payload")

        document = self._documents.create(
            doc_type, payload, filename, user_id=user_id
        )
        try:
            self._sync.execute([document.id])  # type: ignore[list-item]
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Initial indexing failed for document %s: %s", document.id, exc
            )
        published = self._documents.get_by_id(document.id) or document  # type: ignore[arg-type]
        if published.status == "synced":
            return published
        return self._documents.mark_published(document.id)  # type: ignore[arg-type]
