"""Add users table for authentication and RBAC

Revision ID: 002
Revises: 001
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('mobile', sa.String(50), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('role', sa.String(20), nullable=False, server_default='user'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('approved_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_login_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], name='fk_users_approved_by'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_user_status', 'users', ['status'], unique=False)
    op.create_index('ix_user_role', 'users', ['role'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_user_role', table_name='users')
    op.drop_index('ix_user_status', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
