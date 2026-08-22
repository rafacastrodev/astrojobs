import json
import logging
import uuid
from pathlib import Path

from domain.documents.entities import DocumentEntity
from domain.documents.errors import (
    ExtractionError,
    FileTooLargeError,
    StorageError,
    UnsupportedFileError,
)
from domain.documents.file_storage import FileStoragePort
from domain.documents.file_text_loader import FileTextLoader
from domain.documents.repository import DocumentRepository
from domain.documents.text_extractor import TextExtractor

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


class UploadResumeUseCase:
    """Stores a user's resume file and indexes the text extracted from it.

    The file lands in object storage before the database row is created, so a
    storage failure never leaves a document pointing at a missing object.
    """

    def __init__(
        self,
        document_repository: DocumentRepository,
        file_loader: FileTextLoader,
        extractor: TextExtractor,
        file_storage: FileStoragePort,
        max_file_bytes: int,
    ):
        self._documents = document_repository
        self._file_loader = file_loader
        self._extractor = extractor
        self._storage = file_storage
        self._max_file_bytes = max_file_bytes

    def execute(self, content: bytes, filename: str, user_id: int) -> DocumentEntity:
        if not content:
            raise UnsupportedFileError("The uploaded file is empty")
        if len(content) > self._max_file_bytes:
            limit_mb = self._max_file_bytes / (1024 * 1024)
            raise FileTooLargeError(f"File is larger than the {limit_mb:.0f}MB limit")

        try:
            text = self._file_loader.load(content, filename)
        except UnsupportedFileError:
            raise
        except Exception as exc:
            raise UnsupportedFileError(str(exc)) from exc

        try:
            payload = self._extractor.extract(text, "resume")
        except Exception as exc:
            raise ExtractionError(str(exc)) from exc

        if not payload:
            raise ExtractionError("Extractor returned an empty payload")

        extension = Path(filename).suffix.lower()
        storage_key = f"resumes/{user_id}/{uuid.uuid4().hex}{extension}"
        try:
            self._storage.upload(
                content,
                storage_key,
                CONTENT_TYPES.get(extension, "application/octet-stream"),
            )
        except Exception as exc:
            raise StorageError(f"Could not store the uploaded file: {exc}") from exc

        try:
            document = self._documents.create(
                "resume",
                payload,
                filename,
                user_id=user_id,
                storage_key=storage_key,
            )
        except Exception:
            self._discard(storage_key)
            raise

        self._write_kb_metadata_sidecar(storage_key, user_id, document.id)  # type: ignore[arg-type]

        return document

    def _write_kb_metadata_sidecar(
        self, storage_key: str, user_id: int, document_id: int
    ) -> None:
        sidecar = {
            "metadataAttributes": {
                "profile_type": "candidate",
                "user_id": user_id,
                "document_id": document_id,
            }
        }
        try:
            self._storage.upload(
                json.dumps(sidecar).encode("utf-8"),
                f"{storage_key}.metadata.json",
                "application/json",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to write KB metadata sidecar for document %s: %s",
                document_id,
                exc,
            )

    def _discard(self, storage_key: str) -> None:
        try:
            self._storage.delete(storage_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to clean up orphaned object %s: %s", storage_key, exc)
