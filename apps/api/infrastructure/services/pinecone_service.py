from pinecone import Pinecone

from app.core.config import settings


class PineconeClient:
    def __init__(self):
        self.client = Pinecone(
            api_key=settings.PINECONE_API_KEY
        )

        self.index = self.client.Index(
            settings.PINECONE_INDEX_NAME
        )

    def upsert(self, vectors: list[dict]):
        self.index.upsert(vectors)

    def query(self, query: str, top_k: int = 10) -> list[dict]:
        return self.index.query(query, top_k=top_k)
