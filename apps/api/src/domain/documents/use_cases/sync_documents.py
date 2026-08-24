import logging
from collections.abc import Callable, Sequence
from typing import Any

from domain.documents.embedder import Embedder
from domain.documents.entities import DocumentType
from domain.documents.errors import SyncConfigurationError
from domain.documents.payload_text import payload_to_embedding_text
from domain.documents.pinecone_client import PineconeClientPort
from domain.documents.repository import DocumentRepository

logger = logging.getLogger(__name__)


class SyncDocumentsUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        embedder: Embedder,
        pinecone_client_factory: Callable[[], PineconeClientPort],
        namespace_resumes: str,
        namespace_jobs: str,
    ):
        self._documents = document_repository
        self._embedder = embedder
        self._pinecone_factory = pinecone_client_factory
        self._namespace_resumes = namespace_resumes
        self._namespace_jobs = namespace_jobs

    def execute(self, ids: Sequence[int] | None = None) -> dict[str, Any]:
        if ids:
            documents = list(self._documents.list_by_ids(ids))
        else:
            documents = [doc for doc in self._documents.list(status="draft")]
            documents.extend(self._documents.list(status="failed"))

        if not documents:
            return {"synced": 0, "failed": 0, "skipped": 0, "results": []}

        try:
            client = self._pinecone_factory()
        except RuntimeError as exc:
            raise SyncConfigurationError(str(exc)) from exc

        synced = 0
        failed = 0
        skipped = 0
        results: list[dict[str, Any]] = []

        for document in documents:
            try:
                vector_id = document.pinecone_id or f"{document.type}-{document.id}"
                text = payload_to_embedding_text(document.payload, document.type)
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
                                "text": text[:2_000],
                            },
                        }
                    ],
                    namespace=self._namespace_for(document.type),
                )
                self._documents.mark_synced(document.id, vector_id)
                synced += 1
                results.append({"id": document.id, "status": "synced", "pinecone_id": vector_id})
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to sync document %s: %s", document.id, exc)
                skipped += 1
                results.append(
                    {
                        "id": document.id,
                        "status": "skipped",
                        "error": "Could not index document",
                    }
                )

        return {"synced": synced, "failed": failed, "skipped": skipped, "results": results}

    def _namespace_for(self, doc_type: DocumentType) -> str:
        if doc_type == "resume":
            return self._namespace_resumes
        return self._namespace_jobs
