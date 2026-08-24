from collections.abc import Sequence
from typing import Protocol

from domain.documents.entities import DocumentEntity, DocumentType


class SemanticMatcher(Protocol):
    """Ranks candidate documents by meaning, independently of exact keywords."""

    def rank(
        self,
        source_payload: dict,
        source_type: DocumentType,
        candidates: Sequence[DocumentEntity],
    ) -> dict[int, float]: ...
