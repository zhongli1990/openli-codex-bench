"""Create prompt_templates, skills, and template_usage_log tables

Revision ID: 001
Revises: None
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Prompt Templates
    op.create_table(
        'prompt_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('subcategory', sa.String(100), nullable=True),
        sa.Column('tags', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('template_body', sa.Text, nullable=False),
        sa.Column('variables', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('sample_values', postgresql.JSONB, nullable=True, server_default='{}'),
        sa.Column('compatible_models', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('tested_models', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('recommended_model', sa.String(100), nullable=True),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('is_latest', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prompt_templates.id'), nullable=True),
        sa.Column('change_summary', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='private'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('published_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint('tenant_id', 'slug', 'version', name='uq_prompt_template_slug_version'),
        sa.CheckConstraint("status IN ('draft', 'published', 'archived', 'deprecated')", name='ck_template_status'),
        sa.CheckConstraint("visibility IN ('private', 'team', 'tenant', 'public')", name='ck_template_visibility'),
    )
    op.create_index('ix_prompt_template_tenant', 'prompt_templates', ['tenant_id'])
    op.create_index('ix_prompt_template_owner', 'prompt_templates', ['owner_id'])
    op.create_index('ix_prompt_template_category', 'prompt_templates', ['category'])
    op.create_index('ix_prompt_template_status', 'prompt_templates', ['status'])
    op.create_index('ix_prompt_template_slug', 'prompt_templates', ['slug'])

    # Skills
    op.create_table(
        'skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('subcategory', sa.String(100), nullable=True),
        sa.Column('tags', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('scope', sa.String(20), nullable=False, server_default='platform'),
        sa.Column('skill_content', sa.Text, nullable=False),
        sa.Column('allowed_tools', sa.Text, nullable=True),
        sa.Column('user_invocable', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('supporting_files', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('compatible_models', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('tested_models', postgresql.JSONB, nullable=True, server_default='[]'),
        sa.Column('recommended_model', sa.String(100), nullable=True),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('is_latest', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id'), nullable=True),
        sa.Column('change_summary', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='private'),
        sa.Column('enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('published_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint('tenant_id', 'slug', 'version', name='uq_skill_slug_version'),
        sa.CheckConstraint("scope IN ('platform', 'tenant', 'project')", name='ck_skill_scope'),
        sa.CheckConstraint("status IN ('draft', 'published', 'archived', 'deprecated')", name='ck_skill_status'),
        sa.CheckConstraint("visibility IN ('private', 'team', 'tenant', 'public')", name='ck_skill_visibility'),
    )
    op.create_index('ix_skill_tenant', 'skills', ['tenant_id'])
    op.create_index('ix_skill_owner', 'skills', ['owner_id'])
    op.create_index('ix_skill_category', 'skills', ['category'])
    op.create_index('ix_skill_scope', 'skills', ['scope'])
    op.create_index('ix_skill_status', 'skills', ['status'])
    op.create_index('ix_skill_slug', 'skills', ['slug'])

    # Template Usage Log
    op.create_table(
        'template_usage_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rendered_prompt', sa.Text, nullable=True),
        sa.Column('variables_used', postgresql.JSONB, nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_usage_template', 'template_usage_log', ['template_id'])
    op.create_index('ix_usage_skill', 'template_usage_log', ['skill_id'])
    op.create_index('ix_usage_user', 'template_usage_log', ['user_id'])
    op.create_index('ix_usage_tenant', 'template_usage_log', ['tenant_id'])


def downgrade() -> None:
    op.drop_table('template_usage_log')
    op.drop_table('skills')
    op.drop_table('prompt_templates')
