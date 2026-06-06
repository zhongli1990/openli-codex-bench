"""Initial schema for workspaces, sessions, runs, run_events

Revision ID: 001
Revises: 
Create Date: 2026-01-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_uri', sa.Text(), nullable=False),
        sa.Column('storage_mode', sa.String(50), nullable=False, server_default='managed_copy'),
        sa.Column('display_name', sa.Text(), nullable=False),
        sa.Column('local_path', sa.Text(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_accessed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_type', 'source_uri', name='uq_workspace_source')
    )
    op.create_index('ix_workspace_tenant', 'workspaces', ['tenant_id'])

    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('runner_type', sa.String(50), nullable=False),
        sa.Column('runner_thread_id', sa.Text(), nullable=False),
        sa.Column('working_directory', sa.Text(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], name='fk_session_workspace')
    )
    op.create_index('ix_session_workspace_created', 'sessions', ['workspace_id', 'created_at'])
    op.create_index('ix_session_tenant', 'sessions', ['tenant_id'])

    op.create_table(
        'runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('runner_run_id', sa.Text(), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='running'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('completed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], name='fk_run_session')
    )
    op.create_index('ix_run_session_created', 'runs', ['session_id', 'created_at'])
    op.create_index('ix_run_tenant', 'runs', ['tenant_id'])

    op.create_table(
        'run_events',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seq', sa.Integer(), nullable=False),
        sa.Column('at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('source', sa.String(50), nullable=False, server_default='runner'),
        sa.Column('event_type', sa.String(100), nullable=True),
        sa.Column('raw_json', postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], name='fk_run_event_run'),
        sa.UniqueConstraint('run_id', 'seq', name='uq_run_event_seq')
    )
    op.create_index('ix_run_event_run_seq', 'run_events', ['run_id', 'seq'])


def downgrade() -> None:
    op.drop_table('run_events')
    op.drop_table('runs')
    op.drop_table('sessions')
    op.drop_table('workspaces')
