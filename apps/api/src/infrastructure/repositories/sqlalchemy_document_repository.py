from collections.abc import Sequence

from sqlalchemy.orm import Session

from domain.documents.entities import DocumentEntity, DocumentStatus, DocumentType
from infrastructure.models.document_model import DocumentModel


class SqlAlchemyDocumentRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self,
        doc_type: DocumentType,
        payload: dict,
        source_filename: str,
    ) -> DocumentEntity:
        model = DocumentModel(
            type=doc_type,
            payload=payload,
            source_filename=source_filename,
            status="draft",
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def get_by_id(self, document_id: int) -> DocumentEntity | None:
        model = self._session.get(DocumentModel, document_id)
        return self._to_entity(model) if model else None

    def list(
        self,
        doc_type: DocumentType | None = None,
        status: DocumentStatus | None = None,
    ) -> Sequence[DocumentEntity]:
        query = self._session.query(DocumentModel)
        if doc_type is not None:
            query = query.filter(DocumentModel.type == doc_type)
        if status is not None:
            query = query.filter(DocumentModel.status == status)
        models = query.order_by(DocumentModel.created_at.desc()).all()
        return [self._to_entity(model) for model in models]

    def list_by_ids(self, ids: Sequence[int]) -> Sequence[DocumentEntity]:
        if not ids:
            return []
        models = (
            self._session.query(DocumentModel)
            .filter(DocumentModel.id.in_(list(ids)))
            .order_by(DocumentModel.created_at.desc())
            .all()
        )
        return [self._to_entity(model) for model in models]

    def mark_synced(self, document_id: int, pinecone_id: str) -> DocumentEntity:
        model = self._session.get(DocumentModel, document_id)
        if model is None:
            raise ValueError(f"Document {document_id} not found")
        model.status = "synced"
        model.pinecone_id = pinecone_id
        model.error_message = None
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def mark_failed(self, document_id: int, error_message: str) -> DocumentEntity:
        model = self._session.get(DocumentModel, document_id)
        if model is None:
            raise ValueError(f"Document {document_id} not found")
        model.status = "failed"
        model.error_message = error_message
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def delete(self, document_id: int) -> bool:
        model = self._session.get(DocumentModel, document_id)
        if model is None:
            return False
        self._session.delete(model)
        self._session.commit()
        return True

    @staticmethod
    def _to_entity(model: DocumentModel) -> DocumentEntity:
        return DocumentEntity(
            id=model.id,
            type=model.type,  # type: ignore[arg-type]
            payload=model.payload,
            source_filename=model.source_filename,
            status=model.status,  # type: ignore[arg-type]
            pinecone_id=model.pinecone_id,
            error_message=model.error_message,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
