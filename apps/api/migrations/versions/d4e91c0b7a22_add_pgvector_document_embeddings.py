"""add pgvector document embeddings

Revision ID: d4e91c0b7a22
Revises: a8c4e2b19d70
"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import text

revision: str = "d4e91c0b7a22"
down_revision: str | Sequence[str] | None = "a8c4e2b19d70"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _vector_available() -> bool:
    return bool(
        op.get_bind()
        .execute(text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'"))
        .scalar()
    )


def upgrade() -> None:
    if not _vector_available():
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        CREATE TABLE document_embeddings (
            id VARCHAR(255) PRIMARY KEY,
            namespace VARCHAR(64) NOT NULL,
            document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
            embedding vector(1024) NOT NULL,
            meta JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX ix_document_embeddings_namespace ON document_embeddings (namespace)"
    )
    op.execute(
        "CREATE INDEX ix_document_embeddings_embedding "
        "ON document_embeddings USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS document_embeddings")
    if _vector_available():
        op.execute("DROP EXTENSION IF EXISTS vector")
