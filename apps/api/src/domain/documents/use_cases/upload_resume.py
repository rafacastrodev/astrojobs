import logging
import uuid
from pathlib import Path

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalysisServiceError
from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
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
        analyze_resume_use_case: AnalyzeResumeUseCase | None = None,
    ):
        self._documents = document_repository
        self._file_loader = file_loader
        self._extractor = extractor
        self._storage = file_storage
        self._max_file_bytes = max_file_bytes
        self._analyze = analyze_resume_use_case

    def execute(
        self, content: bytes, filename: str, user_id: int
    ) -> tuple[DocumentEntity, AnalysisEntity | None]:
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

        analysis = self._run_initial_analysis(document.id, user_id)  # type: ignore[arg-type]
        return document, analysis

    def _run_initial_analysis(
        self, resume_document_id: int, user_id: int
    ) -> AnalysisEntity | None:
        if self._analyze is None:
            return None
        try:
            return self._analyze.execute(
                user_id=user_id,
                resume_document_id=resume_document_id,
                job_source="none",
            )
        except AnalysisServiceError as exc:
            logger.warning(
                "Initial resume analysis failed for document %s: %s",
                resume_document_id,
                exc,
            )
            return None

    def _discard(self, storage_key: str) -> None:
        try:
            self._storage.delete(storage_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to clean up orphaned object %s: %s", storage_key, exc)
