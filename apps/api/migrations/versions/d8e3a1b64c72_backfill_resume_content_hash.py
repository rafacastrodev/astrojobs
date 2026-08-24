"""backfill resume content hash

Revision ID: d8e3a1b64c72
Revises: c9a2b7e14f80
Create Date: 2026-08-24
"""

import hashlib
import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e3a1b64c72"
down_revision: str | Sequence[str] | None = "c9a2b7e14f80"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE documents SET content_hash = NULL WHERE type = 'resume'"))
    rows = conn.execute(
        sa.text(
            """
            SELECT id, user_id, payload
            FROM documents
            WHERE type = 'resume'
            ORDER BY id
            """
        )
    ).mappings().all()
    seen: set[tuple[object, str]] = set()
    for row in rows:
        payload = row["payload"]
        if isinstance(payload, str):
            payload = json.loads(payload)
        if not isinstance(payload, dict):
            continue
        full_text = payload.get("full_text")
        if not isinstance(full_text, str) or not full_text:
            continue
        digest = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
        key = (row["user_id"], digest)
        if key in seen:
            continue
        conn.execute(
            sa.text("UPDATE documents SET content_hash = :digest WHERE id = :id"),
            {"digest": digest, "id": row["id"]},
        )
        seen.add(key)


def downgrade() -> None:
    pass
