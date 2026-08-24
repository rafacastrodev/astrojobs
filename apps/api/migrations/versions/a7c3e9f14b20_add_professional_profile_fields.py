"""add professional profile fields to users

Revision ID: a7c3e9f14b20
Revises: 74c1a9e52d60
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7c3e9f14b20"
down_revision: str | Sequence[str] | None = "74c1a9e52d60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("company", sa.String(length=120), nullable=True))
    op.add_column(
        "users", sa.Column("job_title", sa.String(length=120), nullable=True)
    )
    op.add_column("users", sa.Column("region", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("salary_min_usd", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("salary_max_usd", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "salary_max_usd")
    op.drop_column("users", "salary_min_usd")
    op.drop_column("users", "region")
    op.drop_column("users", "job_title")
    op.drop_column("users", "company")
