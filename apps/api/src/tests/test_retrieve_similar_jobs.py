from domain.documents.use_cases.retrieve_similar_jobs import RetrieveSimilarJobsUseCase


class _Embedder:
    def embed(self, texts):
        assert texts
        return [[0.1, 0.2, 0.3]]


class _Store:
    def query(self, vector, namespace, top_k):
        assert namespace == "jobs"
        assert top_k == 5
        assert vector == [0.1, 0.2, 0.3]
        return [
            {"id": "job-1", "score": 0.91, "metadata": {"text": "Python backend role"}},
            {"id": "job-2", "score": 0.4, "metadata": {}},
        ]


def test_retrieve_similar_jobs_uses_metadata_text() -> None:
    use_case = RetrieveSimilarJobsUseCase(_Embedder(), lambda: _Store(), "jobs")
    assert use_case.execute({"skills": ["Python"]}) == ["Python backend role"]


def test_retrieve_similar_jobs_uses_gateway_when_configured() -> None:
    class _Gateway:
        def retrieve(self, query, top_k):
            assert "Python" in query
            assert top_k == 5
            return ["Senior FastAPI role"]

    use_case = RetrieveSimilarJobsUseCase(
        _Embedder(),
        lambda: _Store(),
        "jobs",
        context_retriever=_Gateway(),
    )
    assert use_case.execute({"skills": ["Python"]}) == ["Senior FastAPI role"]


def test_retrieve_similar_jobs_returns_empty_on_store_failure() -> None:
    class _Broken:
        def query(self, *_args, **_kwargs):
            raise RuntimeError("down")

    use_case = RetrieveSimilarJobsUseCase(_Embedder(), lambda: _Broken(), "jobs")
    assert use_case.execute({"skills": ["Python"]}) == []
