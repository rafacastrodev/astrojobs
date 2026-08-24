from functools import lru_cache

from sqlalchemy.orm import Session

from domain.documents.embedder import Embedder
from domain.documents.pinecone_client import PineconeClientPort
from infrastructure.database.config import settings
from infrastructure.services.agentcore_gateway_retriever import (
    AgentCoreGatewayRetriever,
)
from infrastructure.services.bedrock_kb_retriever import BedrockKnowledgeBaseRetriever
from infrastructure.services.gemini_embedder import GeminiEmbedder
from infrastructure.services.local_semantic_embedder import LocalSemanticEmbedder
from infrastructure.services.openai_embedder import OpenAIEmbedder
from infrastructure.services.pairwise_semantic_matcher import PairwiseSemanticMatcher
from infrastructure.services.pgvector_store import PgVectorStore
from infrastructure.services.pinecone_service import PineconeClient


def make_embedder(input_type: str = "passage") -> Embedder:
    provider = settings.embedding_provider
    if provider == "auto":
        if settings.gemini_api_key.strip():
            provider = "gemini"
        elif settings.openai_api_key.strip():
            provider = "openai"
        else:
            provider = "local"
    if provider == "gemini":
        return GeminiEmbedder(input_type=input_type)
    if provider == "openai":
        return OpenAIEmbedder()
    return LocalSemanticEmbedder()


@lru_cache(maxsize=1)
def make_semantic_matcher() -> PairwiseSemanticMatcher:
    return PairwiseSemanticMatcher(
        make_embedder(input_type="query"),
        make_embedder(input_type="passage"),
    )


def make_vector_store(db: Session | None = None) -> PineconeClientPort:
    if settings.uses_pgvector:
        if db is None:
            raise RuntimeError("pgvector requires a database session")
        return PgVectorStore(db)
    return PineconeClient()


def make_context_retriever():
    knowledge_base_id = settings.bedrock_knowledge_base_id.strip()
    if knowledge_base_id:
        return BedrockKnowledgeBaseRetriever(
            knowledge_base_id=knowledge_base_id,
            region=settings.aws_region,
        )
    url = settings.agentcore_gateway_url.strip()
    if not url:
        return None
    return AgentCoreGatewayRetriever(
        gateway_url=url,
        tool_name=settings.agentcore_retrieve_tool.strip()
        or "astrojobs-target___Retrieve",
        region=settings.aws_region,
    )
