"""add onboarding status to users

Revision ID: c1f8a3d06e47
Revises: a7c3e9f14b20
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c1f8a3d06e47"
down_revision: str | Sequence[str] | None = "a7c3e9f14b20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "onboarding_status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
    )
    op.execute(
        """
        UPDATE users
        SET onboarding_status = 'completed'
        WHERE role = 'recruiter'
           OR (
             job_title IS NOT NULL AND btrim(job_title) <> ''
             AND region IS NOT NULL AND btrim(region) <> ''
           )
        """
    )
    op.alter_column("users", "onboarding_status", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "onboarding_status")
