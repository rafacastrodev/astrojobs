import logging
import math
from collections import OrderedDict
from collections.abc import Sequence
from hashlib import sha256
from threading import Lock

from domain.documents.embedder import Embedder
from domain.documents.entities import DocumentEntity, DocumentType
from domain.documents.payload_text import payload_to_embedding_text
from infrastructure.services.local_semantic_embedder import LocalSemanticEmbedder

logger = logging.getLogger(__name__)
CACHE_SIZE = 2_048


class PairwiseSemanticMatcher:
    def __init__(
        self,
        query_embedder: Embedder,
        document_embedder: Embedder,
        fallback: Embedder | None = None,
    ) -> None:
        self._query_embedder = query_embedder
        self._document_embedder = document_embedder
        self._fallback = fallback or LocalSemanticEmbedder()
        self._query_cache: OrderedDict[str, list[float]] = OrderedDict()
        self._document_cache: OrderedDict[str, list[float]] = OrderedDict()
        self._cache_lock = Lock()

    def rank(
        self,
        source_payload: dict,
        source_type: DocumentType,
        candidates: Sequence[DocumentEntity],
    ) -> dict[int, float]:
        identified = [candidate for candidate in candidates if candidate.id is not None]
        if not identified:
            return {}

        query_text = payload_to_embedding_text(source_payload, source_type)
        candidate_texts = [
            payload_to_embedding_text(candidate.payload, candidate.type)
            for candidate in identified
        ]
        try:
            query = self._embed_cached(
                self._query_embedder, [query_text], self._query_cache
            )[0]
            vectors = self._embed_cached(
                self._document_embedder, candidate_texts, self._document_cache
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "AI semantic matching unavailable; using local fallback: %s", exc
            )
            query = self._fallback.embed([query_text])[0]
            vectors = self._fallback.embed(candidate_texts)

        return {
            candidate.id: _calibrated_cosine(query, vector)
            for candidate, vector in zip(identified, vectors, strict=True)
            if candidate.id is not None
        }

    def _embed_cached(
        self,
        embedder: Embedder,
        texts: Sequence[str],
        cache: OrderedDict[str, list[float]],
    ) -> list[list[float]]:
        keys = [sha256(text.encode("utf-8")).hexdigest() for text in texts]
        with self._cache_lock:
            missing = {
                key: text
                for key, text in zip(keys, texts, strict=True)
                if key not in cache
            }
            if missing:
                embedded = embedder.embed(list(missing.values()))
                for key, vector in zip(missing, embedded, strict=True):
                    cache[key] = vector
                    cache.move_to_end(key)
                while len(cache) > CACHE_SIZE:
                    cache.popitem(last=False)
            return [cache[key] for key in keys]


def _calibrated_cosine(left: list[float], right: list[float]) -> float:
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    cosine = sum(a * b for a, b in zip(left, right, strict=True)) / (
        left_norm * right_norm
    )
    # Generic embedding models commonly place unrelated business text around
    # 0.35. Calibrating that baseline prevents every document looking relevant.
    return max(0.0, min(1.0, (cosine - 0.35) / 0.60))
