from types import SimpleNamespace

import pytest

from infrastructure.services.bedrock_kb_retriever import BedrockKnowledgeBaseRetriever
from infrastructure.services.gemini_embedder import GeminiEmbedder
from infrastructure.services.local_semantic_embedder import LocalSemanticEmbedder
from infrastructure.services.openai_embedder import OpenAIEmbedder
from infrastructure.services.pgvector_store import PgVectorStore
from infrastructure.vector.factory import (
    make_context_retriever,
    make_embedder,
    make_vector_store,
)


def test_explicit_openai_provider_uses_openai(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(
            uses_pgvector=False,
            pinecone_api_key="configured",
            embedding_provider="openai",
        ),
    )
    assert isinstance(make_embedder(), OpenAIEmbedder)


def test_auto_provider_prefers_gemini(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(
            embedding_provider="auto",
            gemini_api_key="configured",
            openai_api_key="configured",
        ),
    )
    assert isinstance(make_embedder(), GeminiEmbedder)


def test_auto_provider_has_local_fallback_without_api_keys(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.vector.factory.settings",
        SimpleNamespace(
            embedding_provider="auto",
            gemini_api_key="",
            openai_api_key="",
        ),
    )
    assert isinstance(make_embedder(), LocalSemanticEmbedder)


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
