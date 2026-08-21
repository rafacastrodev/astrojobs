from typing import Optional, Protocol, Sequence

from domain.entities.document_entity import DocumentEntity, DocumentStatus, DocumentType


class DocumentRepository(Protocol):
    def create(
        self,
        doc_type: DocumentType,
        payload: dict,
        source_filename: str,
    ) -> DocumentEntity: ...

    def get_by_id(self, document_id: int) -> Optional[DocumentEntity]: ...

    def list(
        self,
        doc_type: Optional[DocumentType] = None,
        status: Optional[DocumentStatus] = None,
    ) -> Sequence[DocumentEntity]: ...

    def list_by_ids(self, ids: Sequence[int]) -> Sequence[DocumentEntity]: ...

    def mark_synced(self, document_id: int, pinecone_id: str) -> DocumentEntity: ...

    def mark_failed(self, document_id: int, error_message: str) -> DocumentEntity: ...

    def delete(self, document_id: int) -> bool: ...
