from domain.documents.entities import DocumentEntity, DocumentType
from domain.documents.errors import ExtractionError, UnsupportedFileError
from domain.documents.file_text_loader import FileTextLoader
from domain.documents.repository import DocumentRepository
from domain.documents.text_extractor import TextExtractor


class CreateDocumentFromUploadUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        file_loader: FileTextLoader,
        extractor: TextExtractor,
    ):
        self._documents = document_repository
        self._file_loader = file_loader
        self._extractor = extractor

    def execute(self, content: bytes, filename: str, doc_type: DocumentType) -> DocumentEntity:
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

        return self._documents.create(doc_type, payload, filename)
