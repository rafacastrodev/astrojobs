from pinecone import Pinecone

from core.config import settings


class PineconeClient:
    def __init__(self):
        if not settings.pinecone_api_key or not settings.pinecone_index_name:
            raise RuntimeError(
                "Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX_NAME."
            )
        self.client = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.client.Index(settings.pinecone_index_name)

    def upsert(self, vectors: list[dict], namespace: str) -> None:
        self.index.upsert(vectors=vectors, namespace=namespace)

    def delete(self, ids: list[str], namespace: str) -> None:
        if not ids:
            return
        self.index.delete(ids=ids, namespace=namespace)
