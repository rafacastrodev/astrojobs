"""add extracted keywords to resume analyses

Revision ID: c4a1f7d92b30
Revises: b7c2e9a41f08
Create Date: 2026-08-24

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'c4a1f7d92b30'
down_revision: str | Sequence[str] | None = 'b7c2e9a41f08'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'resume_analyses',
        sa.Column('years_of_experience', sa.Integer(), nullable=True),
    )
    op.add_column(
        'resume_analyses',
        sa.Column('technologies', sa.JSON(), nullable=False, server_default='[]'),
    )
    op.add_column(
        'resume_analyses',
        sa.Column('companies', sa.JSON(), nullable=False, server_default='[]'),
    )


def downgrade() -> None:
    op.drop_column('resume_analyses', 'companies')
    op.drop_column('resume_analyses', 'technologies')
    op.drop_column('resume_analyses', 'years_of_experience')
