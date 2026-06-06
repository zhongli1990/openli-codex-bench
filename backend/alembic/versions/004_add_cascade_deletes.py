"""Add CASCADE delete to foreign keys

Revision ID: 004_add_cascade_deletes
Revises: 003_add_rbac_tables
Create Date: 2026-02-08

This migration adds ON DELETE CASCADE to foreign keys so that
deleting a workspace properly cascades to sessions, runs, events, and messages.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Sessions -> Workspaces: CASCADE
    op.drop_constraint('sessions_workspace_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key(
        'sessions_workspace_id_fkey', 'sessions', 'workspaces',
        ['workspace_id'], ['id'], ondelete='CASCADE'
    )

    # Runs -> Sessions: CASCADE
    op.drop_constraint('runs_session_id_fkey', 'runs', type_='foreignkey')
    op.create_foreign_key(
        'runs_session_id_fkey', 'runs', 'sessions',
        ['session_id'], ['id'], ondelete='CASCADE'
    )

    # RunEvents -> Runs: CASCADE
    op.drop_constraint('run_events_run_id_fkey', 'run_events', type_='foreignkey')
    op.create_foreign_key(
        'run_events_run_id_fkey', 'run_events', 'runs',
        ['run_id'], ['id'], ondelete='CASCADE'
    )

    # Messages -> Sessions: CASCADE
    op.drop_constraint('messages_session_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_session_id_fkey', 'messages', 'sessions',
        ['session_id'], ['id'], ondelete='CASCADE'
    )

    # Messages -> Runs: SET NULL (run_id is nullable)
    op.drop_constraint('messages_run_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_run_id_fkey', 'messages', 'runs',
        ['run_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    # Revert to original constraints without CASCADE
    op.drop_constraint('messages_run_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_run_id_fkey', 'messages', 'runs',
        ['run_id'], ['id']
    )

    op.drop_constraint('messages_session_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_session_id_fkey', 'messages', 'sessions',
        ['session_id'], ['id']
    )

    op.drop_constraint('run_events_run_id_fkey', 'run_events', type_='foreignkey')
    op.create_foreign_key(
        'run_events_run_id_fkey', 'run_events', 'runs',
        ['run_id'], ['id']
    )

    op.drop_constraint('runs_session_id_fkey', 'runs', type_='foreignkey')
    op.create_foreign_key(
        'runs_session_id_fkey', 'runs', 'sessions',
        ['session_id'], ['id']
    )

    op.drop_constraint('sessions_workspace_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key(
        'sessions_workspace_id_fkey', 'sessions', 'workspaces',
        ['workspace_id'], ['id']
    )
