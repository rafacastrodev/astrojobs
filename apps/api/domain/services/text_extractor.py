from typing import Any, Protocol

from domain.entities.document_entity import DocumentType


class TextExtractor(Protocol):
    def extract(self, text: str, doc_type: DocumentType) -> dict[str, Any]: ...
