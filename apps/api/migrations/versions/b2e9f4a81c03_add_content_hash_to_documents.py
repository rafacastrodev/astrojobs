"""add content hash to documents

Revision ID: b2e9f4a81c03
Revises: e6b4c8d12a90
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2e9f4a81c03"
down_revision: str | Sequence[str] | None = "e6b4c8d12a90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("content_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_documents_content_hash"),
        "documents",
        ["content_hash"],
        unique=False,
    )
    op.create_index(
        "uq_documents_user_type_content_hash",
        "documents",
        ["user_id", "type", "content_hash"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL AND content_hash IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_documents_user_type_content_hash", table_name="documents")
    op.drop_index(op.f("ix_documents_content_hash"), table_name="documents")
    op.drop_column("documents", "content_hash")
