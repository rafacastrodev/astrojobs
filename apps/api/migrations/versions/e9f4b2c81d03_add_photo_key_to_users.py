"""add photo key to users

Revision ID: e9f4b2c81d03
Revises: d8e3a1b64c72
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e9f4b2c81d03"
down_revision: str | Sequence[str] | None = "d8e3a1b64c72"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("photo_key", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "photo_key")
