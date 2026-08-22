from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.session import Base
from infrastructure.models.analysis_feedback_model import AnalysisFeedbackModel


class AnalysisModel(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_source: Mapped[str] = mapped_column(String(20), nullable=False)
    # A removed job must not take the reviewer's feedback down with it, so the
    # analysis outlives it with only job_title left as a label.
    job_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    job_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
    years_of_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    technologies: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    companies: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    feedback: Mapped[AnalysisFeedbackModel | None] = relationship(
        AnalysisFeedbackModel,
        lazy="joined",
        uselist=False,
        cascade="all, delete-orphan",
    )
