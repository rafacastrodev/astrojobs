from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.session import Base


class DocumentModel(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    source_filename: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    pinecone_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    analysis_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Null for documents uploaded through the admin flow (job postings).
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
