from typing import Protocol


class FileTextLoader(Protocol):
    def load(self, content: bytes, filename: str) -> str: ...
