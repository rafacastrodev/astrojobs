from collections.abc import Sequence

import httpx

from infrastructure.database.config import settings

_BATCH_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
)
BATCH_SIZE = 96


class GeminiEmbedder:
    def __init__(self, input_type: str = "passage") -> None:
        self._api_key = settings.gemini_api_key.strip()
        self._model = settings.gemini_embedding_model.removeprefix("models/")
        self._task_type = (
            "RETRIEVAL_QUERY" if input_type == "query" else "RETRIEVAL_DOCUMENT"
        )

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not self._api_key:
            raise RuntimeError("Gemini embeddings are not configured")

        vectors: list[list[float]] = []
        with httpx.Client(timeout=settings.openai_timeout_seconds) as client:
            for start in range(0, len(texts), BATCH_SIZE):
                batch = [text or " " for text in texts[start : start + BATCH_SIZE]]
                model_name = f"models/{self._model}"
                response = client.post(
                    _BATCH_EMBED_URL.format(model=self._model),
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": self._api_key,
                    },
                    json={
                        "requests": [
                            {
                                "model": model_name,
                                "content": {"parts": [{"text": text}]},
                                "taskType": self._task_type,
                                "outputDimensionality": settings.embedding_dimensions,
                            }
                            for text in batch
                        ]
                    },
                )
                response.raise_for_status()
                embeddings = response.json().get("embeddings") or []
                if len(embeddings) != len(batch):
                    raise RuntimeError("Gemini returned an incomplete embedding batch")
                vectors.extend(
                    [float(value) for value in embedding.get("values") or []]
                    for embedding in embeddings
                )

        if any(len(vector) != settings.embedding_dimensions for vector in vectors):
            raise RuntimeError("Gemini returned an unexpected embedding dimension")
        return vectors
