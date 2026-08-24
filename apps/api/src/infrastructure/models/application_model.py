from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.session import Base


class ApplicationModel(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint(
            "job_document_id",
            "applicant_user_id",
            name="uq_applications_job_applicant",
        ),
        CheckConstraint(
            "status IN ('submitted', 'reviewing', 'accepted', 'rejected', 'removed')",
            name="application_status_valid",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    applicant_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recruiter_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    status: Mapped[str] = mapped_column(
        String(20), default="submitted", server_default="submitted", nullable=False
    )


class ApplicationStatusHistoryModel(Base):
    __tablename__ = "application_status_history"
    __table_args__ = (
        CheckConstraint(
            "from_status IS NULL OR from_status IN "
            "('submitted', 'reviewing', 'accepted', 'rejected', 'removed')",
            name="application_history_from_status_valid",
        ),
        CheckConstraint(
            "to_status IN ('submitted', 'reviewing', 'accepted', 'rejected', 'removed')",
            name="application_history_to_status_valid",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
