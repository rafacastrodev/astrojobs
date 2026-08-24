import logging
from collections.abc import Callable

from domain.documents.embedder import Embedder
from domain.documents.payload_text import payload_to_embedding_text
from domain.documents.pinecone_client import PineconeClientPort

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
MAX_SNIPPET_CHARS = 2_000


class RetrieveSimilarJobsUseCase:
    def __init__(
        self,
        query_embedder: Embedder,
        vector_store_factory: Callable[[], PineconeClientPort],
        namespace_jobs: str,
        top_k: int = DEFAULT_TOP_K,
        context_retriever=None,
    ):
        self._embedder = query_embedder
        self._vector_store_factory = vector_store_factory
        self._namespace_jobs = namespace_jobs
        self._top_k = top_k
        self._context_retriever = context_retriever

    def execute(self, resume_payload: dict) -> list[str]:
        text = payload_to_embedding_text(resume_payload, "resume")
        if not text.strip():
            return []
        if self._context_retriever is not None:
            try:
                return list(self._context_retriever.retrieve(text, self._top_k) or [])
            except Exception as exc:  # noqa: BLE001
                logger.warning("Job context retrieval failed: %s", exc)
                return []
        try:
            vector = self._embedder.embed([text])[0]
            matches = self._vector_store_factory().query(
                vector, self._namespace_jobs, self._top_k
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Job context retrieval failed: %s", exc)
            return []

        snippets: list[str] = []
        for match in matches:
            snippet = str((match.get("metadata") or {}).get("text") or "").strip()
            if snippet:
                snippets.append(snippet[:MAX_SNIPPET_CHARS])
        return snippets
