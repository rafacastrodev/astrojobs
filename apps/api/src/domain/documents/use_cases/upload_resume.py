import hashlib
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from domain.analysis.analyzer import ResumeAnalyzer
from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalyzerError
from domain.analysis.repository import AnalysisRepository
from domain.documents.entities import DocumentEntity
from domain.documents.errors import (
    DuplicateDocumentError,
    ExtractionError,
    ExtractionServiceError,
    FileTooLargeError,
    StorageError,
    UnsupportedFileError,
)
from domain.documents.file_storage import FileStoragePort
from domain.documents.file_text_loader import FileTextLoader
from domain.documents.repository import DocumentRepository
from domain.documents.safety import (
    ContentSafetyChecker,
    FileSafetyValidator,
    PiiRedactor,
)
from domain.documents.text_extractor import TextExtractor
from domain.documents.use_cases.retrieve_similar_jobs import RetrieveSimilarJobsUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


def _payload_file_size(payload: dict) -> int | None:
    file_meta = payload.get("file") if isinstance(payload, dict) else None
    if not isinstance(file_meta, dict):
        return None
    size = file_meta.get("size")
    return size if isinstance(size, int) else None


@dataclass
class UploadedResume:
    document: DocumentEntity
    analysis: AnalysisEntity | None
    created: bool


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
        file_validator: FileSafetyValidator,
        pii_redactor: PiiRedactor,
        content_safety: ContentSafetyChecker,
        analyzer: ResumeAnalyzer,
        analysis_repository: AnalysisRepository,
        sync_documents_use_case: SyncDocumentsUseCase | None = None,
        similar_jobs: RetrieveSimilarJobsUseCase | None = None,
    ):
        self._documents = document_repository
        self._file_loader = file_loader
        self._extractor = extractor
        self._storage = file_storage
        self._max_file_bytes = max_file_bytes
        self._file_validator = file_validator
        self._pii_redactor = pii_redactor
        self._content_safety = content_safety
        self._analyzer = analyzer
        self._analyses = analysis_repository
        self._sync = sync_documents_use_case
        self._similar_jobs = similar_jobs

    def execute(
        self, content: bytes, filename: str, user_id: int
    ) -> tuple[DocumentEntity, AnalysisEntity | None]:
        if not content:
            raise UnsupportedFileError("The uploaded file is empty")
        if len(content) > self._max_file_bytes:
            limit_mb = self._max_file_bytes / (1024 * 1024)
            raise FileTooLargeError(f"File is larger than the {limit_mb:.0f}MB limit")

        content_hash = hashlib.sha256(content).hexdigest()
        if self._already_uploaded(user_id, filename, len(content), content_hash):
            raise DuplicateDocumentError("This resume was already uploaded")

        self._file_validator.validate(content, filename)

        try:
            text = self._file_loader.load(content, filename)
        except UnsupportedFileError:
            raise
        except Exception as exc:
            raise UnsupportedFileError(str(exc)) from exc

        redaction = self._pii_redactor.redact(text)
        self._content_safety.check(redaction.redacted_text)

        try:
            payload = self._extractor.extract(redaction.redacted_text, "resume")
        except (ExtractionError, ExtractionServiceError):
            raise
        except Exception as exc:
            raise ExtractionError(str(exc)) from exc

        if not payload:
            raise ExtractionError("Extractor returned an empty payload")

        payload = {
            "schema_version": 2,
            **payload,
            "contact": redaction.contact,
            "full_text": text,
            "file": {"name": Path(filename).name, "size": len(content)},
            "structure": self._structure(payload),
        }
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
                content_hash=content_hash,
            )
        except Exception:
            self._discard(storage_key)
            raise

        analysis = self._analyze(document, user_id)

        document = self._index(document)
        return document, analysis

    def _already_uploaded(
        self, user_id: int, filename: str, size: int, content_hash: str
    ) -> bool:
        if self._documents.get_by_user_content_hash(user_id, "resume", content_hash):
            return True
        incoming_name = Path(filename).name.casefold()
        for document in self._documents.list_by_user(user_id, "resume"):
            if Path(document.source_filename).name.casefold() != incoming_name:
                continue
            stored_size = _payload_file_size(document.payload)
            if stored_size is None or stored_size == size:
                return True
        return False

    def _analyze(
        self, document: DocumentEntity, user_id: int
    ) -> AnalysisEntity | None:
        if document.id is None:
            return None
        try:
            retrieved = (
                self._similar_jobs.execute(document.payload)
                if self._similar_jobs
                else []
            )
            result = self._analyzer.analyze(document.payload, None, retrieved)
            analysis = self._analyses.create(
                user_id=user_id,
                resume_document_id=document.id,
                job_source="none",
                job_document_id=None,
                job_title=None,
                score=result["score"],
                summary=result["summary"],
                findings=result["findings"],
                years_of_experience=result["years_of_experience"],
                technologies=result["technologies"],
                companies=result["companies"],
            )
            self._documents.mark_analysis_completed(document.id)
            return analysis
        except Exception as exc:  # noqa: BLE001
            logger.warning("Initial analysis failed for document %s: %s", document.id, exc)
            message = (
                str(exc)
                if isinstance(exc, AnalyzerError)
                else "Resume analysis is temporarily unavailable"
            )
            self._documents.mark_analysis_failed(document.id, message)
            return None

    def _index(self, document: DocumentEntity) -> DocumentEntity:
        if self._sync is None or document.id is None:
            return document
        try:
            self._sync.execute([document.id])
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Initial resume indexing failed for document %s: %s",
                document.id,
                exc,
            )
        published = self._documents.get_by_id(document.id) or document
        if published.status == "synced":
            return published
        return self._documents.mark_published(document.id)

    @staticmethod
    def _structure(payload: dict) -> dict[str, object]:
        return {
            "has_summary": bool(payload.get("summary")),
            "has_experience": bool(payload.get("experiences")),
            "has_education": bool(payload.get("education")),
            "has_skills": bool(payload.get("skills")),
            "section_count": sum(
                bool(payload.get(key))
                for key in (
                    "summary",
                    "skills",
                    "experiences",
                    "education",
                    "projects",
                    "certifications",
                    "languages",
                    "additional_sections",
                )
            ),
        }

    def _discard(self, storage_key: str) -> None:
        try:
            self._storage.delete(storage_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to clean up orphaned object %s: %s", storage_key, exc)
