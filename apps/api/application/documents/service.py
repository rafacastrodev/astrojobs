import json
from typing import Any, Optional, Sequence

from application.documents.errors import (
    DocumentNotFoundError,
    ExtractionError,
    SyncConfigurationError,
    UnsupportedFileError,
)
from core.config import settings
from domain.entities.document_entity import DocumentEntity, DocumentStatus, DocumentType
from domain.repositories.document_repository import DocumentRepository
from domain.services.embedder import Embedder
from domain.services.file_text_loader import FileTextLoader
from domain.services.text_extractor import TextExtractor
from infrastructure.services.pinecone_service import PineconeClient


class DocumentService:
    def __init__(
        self,
        documents: DocumentRepository,
        file_loader: FileTextLoader,
        extractor: TextExtractor,
        embedder: Embedder,
        pinecone_factory=PineconeClient,
    ):
        self._documents = documents
        self._file_loader = file_loader
        self._extractor = extractor
        self._embedder = embedder
        self._pinecone_factory = pinecone_factory

    def create_from_upload(
        self,
        content: bytes,
        filename: str,
        doc_type: DocumentType,
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

        return self._documents.create(doc_type, payload, filename)

    def list(
        self,
        doc_type: Optional[DocumentType] = None,
        status: Optional[DocumentStatus] = None,
    ) -> Sequence[DocumentEntity]:
        return self._documents.list(doc_type=doc_type, status=status)

    def get(self, document_id: int) -> DocumentEntity:
        document = self._documents.get_by_id(document_id)
        if document is None:
            raise DocumentNotFoundError(f"Document {document_id} not found")
        return document

    def delete(self, document_id: int) -> None:
        document = self.get(document_id)
        deleted = self._documents.delete(document_id)
        if not deleted:
            raise DocumentNotFoundError(f"Document {document_id} not found")
        if document.pinecone_id:
            try:
                client = self._pinecone_factory()
                client.delete([document.pinecone_id], self._namespace_for(document.type))
            except Exception:
                pass

    def sync(self, ids: Optional[Sequence[int]] = None) -> dict[str, Any]:
        if ids:
            documents = list(self._documents.list_by_ids(ids))
        else:
            documents = [
                doc
                for doc in self._documents.list(status="draft")
            ]
            documents.extend(self._documents.list(status="failed"))

        if not documents:
            return {"synced": 0, "failed": 0, "skipped": 0, "results": []}

        try:
            client = self._pinecone_factory()
        except Exception as exc:
            raise SyncConfigurationError(str(exc)) from exc

        synced = 0
        failed = 0
        results: list[dict[str, Any]] = []

        for document in documents:
            try:
                vector_id = document.pinecone_id or f"{document.type}-{document.id}"
                text = self._payload_to_text(document.payload)
                values = self._embedder.embed([text])[0]
                client.upsert(
                    [
                        {
                            "id": vector_id,
                            "values": values,
                            "metadata": {
                                "document_id": document.id,
                                "type": document.type,
                                "source_filename": document.source_filename,
                            },
                        }
                    ],
                    namespace=self._namespace_for(document.type),
                )
                self._documents.mark_synced(document.id, vector_id)
                synced += 1
                results.append({"id": document.id, "status": "synced", "pinecone_id": vector_id})
            except Exception as exc:
                self._documents.mark_failed(document.id, str(exc))
                failed += 1
                results.append({"id": document.id, "status": "failed", "error": str(exc)})

        return {
            "synced": synced,
            "failed": failed,
            "skipped": 0,
            "results": results,
        }

    def _namespace_for(self, doc_type: DocumentType) -> str:
        if doc_type == "resume":
            return settings.pinecone_namespace_resumes
        return settings.pinecone_namespace_jobs

    def _payload_to_text(self, payload: dict[str, Any]) -> str:
        return json.dumps(payload, ensure_ascii=True, sort_keys=True)
