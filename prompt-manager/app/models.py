import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PromptTemplate(Base):
    """Parameterised prompt templates with versioning and multi-tenant support."""
    __tablename__ = "prompt_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)

    # Content
    template_body: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    sample_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)

    # Model Compatibility
    compatible_models: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    tested_models: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    recommended_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Versioning
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_latest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("prompt_templates.id"), nullable=True)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="private")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", "version", name="uq_prompt_template_slug_version"),
        CheckConstraint("status IN ('draft', 'published', 'archived', 'deprecated')", name="ck_template_status"),
        CheckConstraint("visibility IN ('private', 'team', 'tenant', 'public')", name="ck_template_visibility"),
        Index("ix_prompt_template_tenant", "tenant_id"),
        Index("ix_prompt_template_owner", "owner_id"),
        Index("ix_prompt_template_category", "category"),
        Index("ix_prompt_template_status", "status"),
        Index("ix_prompt_template_slug", "slug"),
    )


class Skill(Base):
    """Skills with versioning, multi-tenant and multi-scope support."""
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="platform")

    # Content
    skill_content: Mapped[str] = mapped_column(Text, nullable=False)
    allowed_tools: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_invocable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Supporting Files
    supporting_files: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)

    # Model Compatibility
    compatible_models: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    tested_models: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    recommended_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Versioning
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_latest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="private")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Workspace link (for project-scope skills)
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", "version", name="uq_skill_slug_version"),
        CheckConstraint("scope IN ('platform', 'tenant', 'project')", name="ck_skill_scope"),
        CheckConstraint("status IN ('draft', 'published', 'archived', 'deprecated')", name="ck_skill_status"),
        CheckConstraint("visibility IN ('private', 'team', 'tenant', 'public')", name="ck_skill_visibility"),
        Index("ix_skill_tenant", "tenant_id"),
        Index("ix_skill_owner", "owner_id"),
        Index("ix_skill_category", "category"),
        Index("ix_skill_scope", "scope"),
        Index("ix_skill_status", "status"),
        Index("ix_skill_slug", "slug"),
    )


class TemplateUsageLog(Base):
    """Analytics: tracks when templates/skills are used."""
    __tablename__ = "template_usage_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    rendered_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    variables_used: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        Index("ix_usage_template", "template_id"),
        Index("ix_usage_skill", "skill_id"),
        Index("ix_usage_user", "user_id"),
        Index("ix_usage_tenant", "tenant_id"),
    )
