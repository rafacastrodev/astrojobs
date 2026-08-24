from infrastructure.services.bedrock_kb_retriever import BedrockKnowledgeBaseRetriever


class _Client:
    def __init__(self, payload):
        self.payload = payload
        self.kwargs = None

    def retrieve(self, **kwargs):
        self.kwargs = kwargs
        return self.payload


def test_bedrock_retrieve_extracts_chunk_text() -> None:
    client = _Client(
        {
            "retrievalResults": [
                {"content": {"text": "Python backend role at Astro"}},
                {"content": {"text": "   "}},
            ]
        }
    )
    retriever = BedrockKnowledgeBaseRetriever(
        knowledge_base_id="QHZW0OOFQ7",
        client=client,
    )
    snippets = retriever.retrieve("Engineer with Python and FastAPI", top_k=5)
    assert snippets == ["Python backend role at Astro"]
    assert client.kwargs["knowledgeBaseId"] == "QHZW0OOFQ7"
    assert client.kwargs["retrievalQuery"] == {
        "text": "Engineer with Python and FastAPI"
    }
    assert "retrievalConfiguration" not in client.kwargs


def test_bedrock_retrieve_returns_empty_on_failure() -> None:
    class _Broken:
        def retrieve(self, **kwargs):
            raise RuntimeError("AccessDenied")

    retriever = BedrockKnowledgeBaseRetriever("QHZW0OOFQ7", client=_Broken())
    assert retriever.retrieve("Python engineer") == []
