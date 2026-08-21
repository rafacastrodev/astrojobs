from typing import Protocol


class FileStoragePort(Protocol):
    def upload(self, content: bytes, key: str, content_type: str) -> None: ...

    def delete(self, key: str) -> None: ...
