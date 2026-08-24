import logging
from collections.abc import Callable
from dataclasses import dataclass

from domain.documents.embedder import Embedder
from domain.documents.entities import DocumentEntity
from domain.documents.errors import SearchConfigurationError
from domain.documents.payload_text import payload_to_embedding_text
from domain.documents.pinecone_client import PineconeClientPort
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
MAX_TOP_K = 50


@dataclass
class JobMatch:
    document: DocumentEntity
    score: float


class MatchJobsForResumeUseCase:
    def __init__(
        self,
        document_repository: DocumentRepository,
        query_embedder: Embedder,
        pinecone_client_factory: Callable[[], PineconeClientPort],
        namespace_jobs: str,
    ):
        self._documents = document_repository
        self._embedder = query_embedder
        self._pinecone_factory = pinecone_client_factory
        self._namespace_jobs = namespace_jobs
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self, resume_document_id: int, user_id: int, top_k: int = DEFAULT_TOP_K
    ) -> list[JobMatch]:
        resume = self._get_resume.execute(resume_document_id, user_id)

        try:
            client = self._pinecone_factory()
        except RuntimeError as exc:
            raise SearchConfigurationError(str(exc)) from exc

        text = payload_to_embedding_text(resume.payload, "resume")
        if not text.strip():
            return []

        vector = self._embedder.embed([text])[0]
        matches = client.query(
            vector,
            namespace=self._namespace_jobs,
            top_k=max(1, min(top_k, MAX_TOP_K)),
        )
        return self._resolve(matches)

    def _resolve(self, matches: list[dict]) -> list[JobMatch]:
        scores: dict[int, float] = {}
        for match in matches:
            document_id = self._document_id(match)
            if document_id is not None and document_id not in scores:
                scores[document_id] = match["score"]

        if not scores:
            return []

        documents = {
            document.id: document
            for document in self._documents.list_by_ids(list(scores))
            if document.id is not None
        }
        resolved = [
            JobMatch(document=documents[document_id], score=score)
            for document_id, score in scores.items()
            if document_id in documents
            and documents[document_id].type == "job"
            and documents[document_id].status == "synced"
        ]
        resolved.sort(key=lambda item: item.score, reverse=True)
        return resolved

    def _document_id(self, match: dict) -> int | None:
        raw = match.get("metadata", {}).get("document_id")
        if raw is None:
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            logger.warning("Pinecone match %s has an unusable document_id", match.get("id"))
            return None
