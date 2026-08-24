from types import SimpleNamespace

import pytest

from infrastructure.services.bedrock_kb_retriever import BedrockKnowledgeBaseRetriever
from infrastructure.services.openai_embedder import OpenAIEmbedder
from infrastructure.services.pgvector_store import PgVectorStore
from infrastructure.vector.factory import (
    make_context_retriever,
    make_embedder,
    make_vector_store,
)


def test_openai_generates_embeddings_for_every_storage_backend(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(
            uses_pgvector=False,
            pinecone_api_key="configured",
            openai_api_key="",
        ),
    )
    assert isinstance(make_embedder(), OpenAIEmbedder)


def test_pgvector_store_requires_a_session(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(uses_pgvector=True),
    )
    with pytest.raises(RuntimeError, match="pgvector requires a database session"):
        make_vector_store()


def test_pgvector_store_uses_the_session(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(uses_pgvector=True),
    )
    session = object()
    store = make_vector_store(session)
    assert isinstance(store, PgVectorStore)
    assert store._session is session


def test_context_retriever_prefers_bedrock_knowledge_base(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(
            bedrock_knowledge_base_id="QHZW0OOFQ7",
            aws_region="us-east-1",
            agentcore_gateway_url="https://ignored.example/mcp",
            agentcore_retrieve_tool="",
            openai_timeout_seconds=20,
        ),
    )
    retriever = make_context_retriever()
    assert isinstance(retriever, BedrockKnowledgeBaseRetriever)
    assert retriever._knowledge_base_id == "QHZW0OOFQ7"
