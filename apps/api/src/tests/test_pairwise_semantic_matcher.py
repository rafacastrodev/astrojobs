from datetime import UTC, datetime

from domain.documents.entities import DocumentEntity
from infrastructure.services.pairwise_semantic_matcher import PairwiseSemanticMatcher


class _Embedder:
    def __init__(self, vector: list[float], fail: bool = False) -> None:
        self.vector = vector
        self.fail = fail
        self.calls = 0

    def embed(self, texts):
        self.calls += 1
        if self.fail:
            raise RuntimeError("provider unavailable")
        return [self.vector for _ in texts]


def _job() -> DocumentEntity:
    now = datetime.now(UTC)
    return DocumentEntity(
        id=7,
        type="job",
        payload={"title": "ML Engineer", "technologies": ["TensorFlow"]},
        source_filename="ML Engineer",
        status="synced",
        pinecone_id=None,
        error_message=None,
        created_at=now,
        updated_at=now,
        user_id=1,
    )


def test_caches_unchanged_payload_embeddings() -> None:
    query = _Embedder([1.0, 0.0])
    documents = _Embedder([1.0, 0.0])
    matcher = PairwiseSemanticMatcher(query, documents)

    first = matcher.rank({"summary": "machine learning"}, "resume", [_job()])
    second = matcher.rank({"summary": "machine learning"}, "resume", [_job()])

    assert first == second == {7: 1.0}
    assert query.calls == 1
    assert documents.calls == 1


def test_uses_local_fallback_when_ai_provider_fails() -> None:
    unavailable = _Embedder([0.0, 0.0], fail=True)
    fallback = _Embedder([1.0, 0.0])
    matcher = PairwiseSemanticMatcher(unavailable, unavailable, fallback)

    assert matcher.rank({"summary": "machine learning"}, "resume", [_job()]) == {7: 1.0}
    assert fallback.calls == 2
