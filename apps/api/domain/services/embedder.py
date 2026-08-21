from typing import Protocol, Sequence


class Embedder(Protocol):
    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...
