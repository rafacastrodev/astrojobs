from collections.abc import Sequence
from typing import Protocol

from domain.documents.entities import DocumentEntity, DocumentStatus, DocumentType


class DocumentRepository(Protocol):
    def create(
        self,
        doc_type: DocumentType,
        payload: dict,
        source_filename: str,
        user_id: int | None = None,
        storage_key: str | None = None,
        content_hash: str | None = None,
    ) -> DocumentEntity: ...

    def get_by_id(self, document_id: int) -> DocumentEntity | None: ...

    def get_by_user_content_hash(
        self,
        user_id: int,
        doc_type: DocumentType,
        content_hash: str,
    ) -> DocumentEntity | None: ...

    def list(
        self,
        doc_type: DocumentType | None = None,
        status: DocumentStatus | None = None,
    ) -> Sequence[DocumentEntity]: ...

    def list_by_user(
        self,
        user_id: int,
        doc_type: DocumentType | None = None,
    ) -> Sequence[DocumentEntity]: ...

    def list_by_ids(self, ids: Sequence[int]) -> Sequence[DocumentEntity]: ...

    def mark_synced(self, document_id: int, pinecone_id: str) -> DocumentEntity: ...

    def mark_published(self, document_id: int) -> DocumentEntity: ...

    def mark_failed(self, document_id: int, error_message: str) -> DocumentEntity: ...

    def mark_analysis_completed(self, document_id: int) -> DocumentEntity: ...

    def mark_analysis_failed(
        self, document_id: int, error_message: str
    ) -> DocumentEntity: ...

    def delete(self, document_id: int) -> bool: ...

    def update_source_filename(
        self, document_id: int, source_filename: str
    ) -> DocumentEntity: ...
