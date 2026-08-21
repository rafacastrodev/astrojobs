from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.session import Base


class AnalysisFeedbackModel(Base):
    """What the reviewer thought of an analysis.

    Kept apart from resume_analyses so the model's own output stays untouched:
    exporting a training set means joining the two, not untangling them.
    """

    __tablename__ = "analysis_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("resume_analyses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[str] = mapped_column(String(10), nullable=False)
    expected_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
