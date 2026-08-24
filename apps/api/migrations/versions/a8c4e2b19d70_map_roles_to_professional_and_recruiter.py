"""map user and admin roles to professional and recruiter

Revision ID: a8c4e2b19d70
Revises: f31b8a65d921
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a8c4e2b19d70"
down_revision: str | Sequence[str] | None = "f31b8a65d921"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'professional' WHERE role = 'user'")
    op.execute("UPDATE users SET role = 'recruiter' WHERE role = 'admin'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'user' WHERE role = 'professional'")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'recruiter'")
