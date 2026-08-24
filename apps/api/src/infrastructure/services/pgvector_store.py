from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column

from pgvector.sqlalchemy import Vector

from infrastructure.database.config import settings
from infrastructure.database.session import Base


class DocumentEmbeddingModel(Base):
    __tablename__ = "document_embeddings"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    namespace: Mapped[str] = mapped_column(String(64), index=True)
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.embedding_dimensions)
    )
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PgVectorStore:
    def __init__(self, session: Session):
        self._session = session

    def upsert(self, vectors: list[dict], namespace: str) -> None:
        for item in vectors:
            metadata = dict(item.get("metadata") or {})
            document_id = metadata.get("document_id")
            row = self._session.get(DocumentEmbeddingModel, item["id"])
            if row is None:
                row = DocumentEmbeddingModel(id=item["id"])
                self._session.add(row)
            row.namespace = namespace
            row.document_id = int(document_id) if document_id is not None else None
            row.embedding = list(item["values"])
            row.meta = metadata
            row.updated_at = datetime.utcnow()
        self._session.commit()

    def delete(self, ids: list[str], namespace: str) -> None:
        if not ids:
            return
        rows = (
            self._session.query(DocumentEmbeddingModel)
            .filter(
                DocumentEmbeddingModel.id.in_(ids),
                DocumentEmbeddingModel.namespace == namespace,
            )
            .all()
        )
        for row in rows:
            self._session.delete(row)
        self._session.commit()

    def query(self, vector: list[float], namespace: str, top_k: int) -> list[dict]:
        distance = DocumentEmbeddingModel.embedding.cosine_distance(vector)
        statement = (
            select(DocumentEmbeddingModel, (1 - distance).label("score"))
            .where(DocumentEmbeddingModel.namespace == namespace)
            .order_by(distance)
            .limit(top_k)
        )
        rows = self._session.execute(statement).all()
        return [
            {
                "id": row.id,
                "score": float(score or 0.0),
                "metadata": dict(row.meta or {}),
            }
            for row, score in rows
        ]
