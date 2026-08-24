import hashlib
import math
import re
import unicodedata
from collections.abc import Sequence
from itertools import pairwise

from domain.documents.technology_catalog import technologies_in_text
from infrastructure.database.config import settings

_TOKEN = re.compile(r"[a-z0-9+#.]{2,}")


class LocalSemanticEmbedder:
    """Deterministic, dependency-free fallback for degraded AI providers.

    It uses feature hashing over normalized words, word pairs and canonical
    technologies. This keeps matching available without pretending to be a
    trained language model.
    """

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        dimensions = settings.embedding_dimensions
        values = [0.0] * dimensions
        normalized = unicodedata.normalize("NFKD", text.casefold())
        normalized = "".join(
            char for char in normalized if not unicodedata.combining(char)
        )
        tokens = _TOKEN.findall(normalized)
        features = list(tokens)
        features.extend(f"{left}_{right}" for left, right in pairwise(tokens))
        features.extend(
            f"tech:{tech.casefold()}" for tech in technologies_in_text(text)
        )

        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            raw = int.from_bytes(digest, "big")
            index = raw % dimensions
            values[index] += -1.0 if raw & 1 else 1.0

        norm = math.sqrt(sum(value * value for value in values))
        if norm:
            values = [value / norm for value in values]
        return values
