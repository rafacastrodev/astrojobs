"""add application lifecycle

Revision ID: 74c1a9e52d60
Revises: 6a4f2c8d91be
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "74c1a9e52d60"
down_revision: str | Sequence[str] | None = "6a4f2c8d91be"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APPLICATION_STATUSES = "'submitted', 'reviewing', 'accepted', 'rejected', 'removed'"


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="submitted",
            nullable=False,
        ),
    )
    op.add_column(
        "applications",
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.execute("UPDATE applications SET updated_at = created_at")
    op.alter_column("applications", "updated_at", nullable=False)
    op.create_check_constraint(
        "application_status_valid",
        "applications",
        f"status IN ({APPLICATION_STATUSES})",
    )

    op.create_table(
        "application_status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            f"from_status IS NULL OR from_status IN ({APPLICATION_STATUSES})",
            name="application_history_from_status_valid",
        ),
        sa.CheckConstraint(
            f"to_status IN ({APPLICATION_STATUSES})",
            name="application_history_to_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
            name=op.f("fk_application_status_history_application_id_applications"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["changed_by_user_id"],
            ["users.id"],
            name=op.f("fk_application_status_history_changed_by_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_application_status_history")),
    )
    op.create_index(
        op.f("ix_application_status_history_application_id"),
        "application_status_history",
        ["application_id"],
        unique=False,
    )
    op.execute(
        """
        INSERT INTO application_status_history (
            application_id, from_status, to_status, changed_by_user_id, created_at
        )
        SELECT id, NULL, 'submitted', applicant_user_id, created_at
        FROM applications
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_application_status_history_application_id"),
        table_name="application_status_history",
    )
    op.drop_table("application_status_history")
    op.drop_constraint("application_status_valid", "applications", type_="check")
    op.drop_column("applications", "updated_at")
    op.drop_column("applications", "status")
