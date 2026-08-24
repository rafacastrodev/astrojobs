"""add job closure and offers

Revision ID: 6a4f2c8d91be
Revises: e9f4b2c81d03
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6a4f2c8d91be"
down_revision: str | Sequence[str] | None = "e9f4b2c81d03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("closed_at", sa.DateTime(), nullable=True))
    op.create_index(
        op.f("ix_documents_closed_at"),
        "documents",
        ["closed_at"],
        unique=False,
    )
    op.create_table(
        "offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_document_id", sa.Integer(), nullable=False),
        sa.Column("resume_document_id", sa.Integer(), nullable=True),
        sa.Column("professional_user_id", sa.Integer(), nullable=False),
        sa.Column("recruiter_user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["job_document_id"],
            ["documents.id"],
            name=op.f("fk_offers_job_document_id_documents"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["resume_document_id"],
            ["documents.id"],
            name=op.f("fk_offers_resume_document_id_documents"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["professional_user_id"],
            ["users.id"],
            name=op.f("fk_offers_professional_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recruiter_user_id"],
            ["users.id"],
            name=op.f("fk_offers_recruiter_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_offers")),
        sa.UniqueConstraint(
            "job_document_id",
            "professional_user_id",
            name="uq_offers_job_professional",
        ),
    )
    op.create_index(
        op.f("ix_offers_job_document_id"),
        "offers",
        ["job_document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_offers_professional_user_id"),
        "offers",
        ["professional_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_offers_recruiter_user_id"),
        "offers",
        ["recruiter_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_offers_recruiter_user_id"), table_name="offers")
    op.drop_index(op.f("ix_offers_professional_user_id"), table_name="offers")
    op.drop_index(op.f("ix_offers_job_document_id"), table_name="offers")
    op.drop_table("offers")
    op.drop_index(op.f("ix_documents_closed_at"), table_name="documents")
    op.drop_column("documents", "closed_at")
