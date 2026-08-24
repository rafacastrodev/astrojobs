from collections.abc import Sequence

from pinecone import Pinecone

from infrastructure.database.config import settings

BATCH_SIZE = 96


class PineconeEmbedder:
    def __init__(self, input_type: str = "passage"):
        self._input_type = input_type
        self._client: Pinecone | None = None

    def _inference(self):
        if self._client is None:
            if not settings.pinecone_api_key:
                raise RuntimeError("Pinecone is not configured. Set PINECONE_API_KEY.")
            self._client = Pinecone(api_key=settings.pinecone_api_key)
        return self._client.inference

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        inference = self._inference()
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH_SIZE):
            batch = [text or " " for text in texts[start : start + BATCH_SIZE]]
            response = inference.embed(
                model=settings.pinecone_embed_model,
                inputs=batch,
                parameters={"input_type": self._input_type, "truncate": "END"},
            )
            vectors.extend(list(item.values) for item in response.data)
        return vectors
