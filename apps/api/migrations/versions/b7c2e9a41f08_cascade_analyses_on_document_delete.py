"""cascade analyses on document delete

Removing a resume used to fail once it had been analysed, because
resume_analyses referenced it with NO ACTION. Analyses now follow the resume
out, while a deleted job only detaches: the reviewer feedback attached to that
analysis is worth more than the link.

Revision ID: b7c2e9a41f08
Revises: 9e241a93a33b
Create Date: 2026-08-21 21:00:00.000000

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7c2e9a41f08'
down_revision: str | Sequence[str] | None = '9e241a93a33b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('resume_analyses', schema=None) as batch_op:
        batch_op.drop_constraint('fk_resume_analyses_user_id_users', type_='foreignkey')
        batch_op.drop_constraint(
            'fk_resume_analyses_resume_document_id_documents', type_='foreignkey'
        )
        batch_op.drop_constraint(
            'fk_resume_analyses_job_document_id_documents', type_='foreignkey'
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_user_id_users',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_resume_document_id_documents',
            'documents',
            ['resume_document_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_job_document_id_documents',
            'documents',
            ['job_document_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('resume_analyses', schema=None) as batch_op:
        batch_op.drop_constraint('fk_resume_analyses_user_id_users', type_='foreignkey')
        batch_op.drop_constraint(
            'fk_resume_analyses_resume_document_id_documents', type_='foreignkey'
        )
        batch_op.drop_constraint(
            'fk_resume_analyses_job_document_id_documents', type_='foreignkey'
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_user_id_users', 'users', ['user_id'], ['id']
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_resume_document_id_documents',
            'documents',
            ['resume_document_id'],
            ['id'],
        )
        batch_op.create_foreign_key(
            'fk_resume_analyses_job_document_id_documents',
            'documents',
            ['job_document_id'],
            ['id'],
        )
