from typing import Protocol


class PineconeClientPort(Protocol):
    def upsert(self, vectors: list[dict], namespace: str) -> None: ...

    def delete(self, ids: list[str], namespace: str) -> None: ...
