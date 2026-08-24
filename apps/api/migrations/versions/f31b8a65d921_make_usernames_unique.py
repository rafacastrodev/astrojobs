"""make usernames unique

Revision ID: f31b8a65d921
Revises: c4a1f7d92b30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from domain.users.username import legacy_username_base, unique_legacy_username

revision: str = "f31b8a65d921"
down_revision: str | Sequence[str] | None = "c4a1f7d92b30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    users = connection.execute(
        sa.text("SELECT id, name FROM users ORDER BY id")
    ).mappings()
    used: set[str] = set()
    for user in users:
        username = unique_legacy_username(
            legacy_username_base(user["name"], user["id"]), user["id"], used
        )
        used.add(username)
        connection.execute(
            sa.text("UPDATE users SET name = :username WHERE id = :user_id"),
            {"username": username, "user_id": user["id"]},
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.create_index("ix_users_name", ["name"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_name")
