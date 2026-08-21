import hashlib
import re
from typing import Sequence

import numpy as np

from core.config import settings


class HashingEmbedder:
    def __init__(self, dimensions: int | None = None):
        self._dimensions = dimensions or settings.embedding_dimensions

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        vector = np.zeros(self._dimensions, dtype=np.float32)
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        if not tokens:
            vector[0] = 1.0
            return vector.tolist()

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self._dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = float(np.linalg.norm(vector))
        if norm > 0:
            vector /= norm
        else:
            vector[0] = 1.0
        return vector.tolist()
