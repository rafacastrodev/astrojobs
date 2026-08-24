from sqlalchemy.orm import Session

from domain.documents.embedder import Embedder
from domain.documents.pinecone_client import PineconeClientPort
from infrastructure.database.config import settings
from infrastructure.services.agentcore_gateway_retriever import AgentCoreGatewayRetriever
from infrastructure.services.bedrock_kb_retriever import BedrockKnowledgeBaseRetriever
from infrastructure.services.openai_embedder import OpenAIEmbedder
from infrastructure.services.pgvector_store import PgVectorStore
from infrastructure.services.pinecone_service import PineconeClient


def make_embedder(input_type: str = "passage") -> Embedder:
    # Keep the vector space identical across pgVector and Pinecone. The
    # storage backend changes by environment; OpenAI remains the embedder.
    del input_type
    return OpenAIEmbedder()


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
