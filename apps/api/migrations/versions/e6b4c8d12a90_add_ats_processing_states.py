"""add ATS category and resume processing states

Revision ID: e6b4c8d12a90
Revises: d4e91c0b7a22
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e6b4c8d12a90"
down_revision: str | Sequence[str] | None = "d4e91c0b7a22"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column(
            "analysis_status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "documents",
        sa.Column("analysis_error_message", sa.Text(), nullable=True),
    )
    op.create_index(
        op.f("ix_documents_analysis_status"),
        "documents",
        ["analysis_status"],
        unique=False,
    )
    op.add_column(
        "resume_analyses",
        sa.Column(
            "ats_category",
            sa.String(length=20),
            nullable=False,
            server_default="low",
        ),
    )
    op.execute(
        """
        UPDATE resume_analyses
        SET ats_category = CASE
            WHEN score < 50 THEN 'low'
            WHEN score < 75 THEN 'medium'
            ELSE 'high'
        END
        """
    )
    op.execute(
        """
        UPDATE documents
        SET analysis_status = 'completed'
        WHERE type = 'resume'
          AND EXISTS (
              SELECT 1 FROM resume_analyses
              WHERE resume_analyses.resume_document_id = documents.id
                AND resume_analyses.job_source = 'none'
          )
        """
    )


def downgrade() -> None:
    op.drop_column("resume_analyses", "ats_category")
    op.drop_index(op.f("ix_documents_analysis_status"), table_name="documents")
    op.drop_column("documents", "analysis_error_message")
    op.drop_column("documents", "analysis_status")
