"""add applications table

Revision ID: c9a2b7e14f80
Revises: b2e9f4a81c03
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9a2b7e14f80"
down_revision: str | Sequence[str] | None = "b2e9f4a81c03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_document_id", sa.Integer(), nullable=False),
        sa.Column("resume_document_id", sa.Integer(), nullable=False),
        sa.Column("applicant_user_id", sa.Integer(), nullable=False),
        sa.Column("recruiter_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["job_document_id"],
            ["documents.id"],
            name=op.f("fk_applications_job_document_id_documents"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["resume_document_id"],
            ["documents.id"],
            name=op.f("fk_applications_resume_document_id_documents"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["applicant_user_id"],
            ["users.id"],
            name=op.f("fk_applications_applicant_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recruiter_user_id"],
            ["users.id"],
            name=op.f("fk_applications_recruiter_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_applications")),
        sa.UniqueConstraint(
            "job_document_id",
            "applicant_user_id",
            name="uq_applications_job_applicant",
        ),
    )
    op.create_index(
        op.f("ix_applications_job_document_id"),
        "applications",
        ["job_document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applications_applicant_user_id"),
        "applications",
        ["applicant_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applications_recruiter_user_id"),
        "applications",
        ["recruiter_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_applications_recruiter_user_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_applicant_user_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_job_document_id"), table_name="applications")
    op.drop_table("applications")
