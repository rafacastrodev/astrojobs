from collections.abc import Sequence

from openai import OpenAI

from infrastructure.database.config import settings

BATCH_SIZE = 96


class OpenAIEmbedder:
    def __init__(self) -> None:
        self._client = self._build_client() if settings.openai_api_key else None

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if self._client is None:
            raise RuntimeError("OpenAI is not configured. Set OPENAI_API_KEY.")
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH_SIZE):
            batch = [text or " " for text in texts[start : start + BATCH_SIZE]]
            response = self._client.embeddings.create(
                model=settings.openai_embedding_model,
                input=batch,
                dimensions=settings.embedding_dimensions,
            )
            ordered = sorted(response.data, key=lambda item: item.index)
            vectors.extend(list(item.embedding) for item in ordered)
        return vectors

    @staticmethod
    def _build_client() -> OpenAI:
        return OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=settings.openai_max_retries,
        )
