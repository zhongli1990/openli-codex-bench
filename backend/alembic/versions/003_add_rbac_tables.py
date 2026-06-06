"""Add RBAC tables for v0.5.0

Revision ID: 003
Revises: 002
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('metadata_json', postgresql.JSONB, nullable=True),
    )

    # Create groups table
    op.create_table(
        'groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_group_tenant_name'),
    )
    op.create_index('ix_group_tenant', 'groups', ['tenant_id'])

    # Create user_groups table
    op.create_table(
        'user_groups',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('added_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('added_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )

    # Create workspace_access table
    op.create_table(
        'workspace_access',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('grantee_type', sa.String(20), nullable=False),
        sa.Column('grantee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access_level', sa.String(20), nullable=False),
        sa.Column('granted_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.UniqueConstraint('workspace_id', 'grantee_type', 'grantee_id', name='uq_workspace_access_grantee'),
    )
    op.create_index('ix_workspace_access_workspace', 'workspace_access', ['workspace_id'])
    op.create_index('ix_workspace_access_grantee', 'workspace_access', ['grantee_type', 'grantee_id'])

    # Add tenant_id to users table
    op.add_column('users', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=True))
    op.create_index('ix_user_tenant', 'users', ['tenant_id'])

    # Add owner_id to workspaces table
    op.add_column('workspaces', sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))
    op.create_index('ix_workspace_owner', 'workspaces', ['owner_id'])


def downgrade() -> None:
    # Remove owner_id from workspaces
    op.drop_index('ix_workspace_owner', table_name='workspaces')
    op.drop_column('workspaces', 'owner_id')

    # Remove tenant_id from users
    op.drop_index('ix_user_tenant', table_name='users')
    op.drop_column('users', 'tenant_id')

    # Drop workspace_access table
    op.drop_index('ix_workspace_access_grantee', table_name='workspace_access')
    op.drop_index('ix_workspace_access_workspace', table_name='workspace_access')
    op.drop_table('workspace_access')

    # Drop user_groups table
    op.drop_table('user_groups')

    # Drop groups table
    op.drop_index('ix_group_tenant', table_name='groups')
    op.drop_table('groups')

    # Drop tenants table
    op.drop_table('tenants')
