import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # github, local, upload
    source_uri: Mapped[str] = mapped_column(Text, nullable=False)
    storage_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="managed_copy")
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    local_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="workspace", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        UniqueConstraint("source_type", "source_uri", name="uq_workspace_source"),
        Index("ix_workspace_tenant", "tenant_id"),
        Index("ix_workspace_owner", "owner_id"),
    )


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    runner_type: Mapped[str] = mapped_column(String(50), nullable=False)
    runner_thread_id: Mapped[str] = mapped_column(Text, nullable=False)
    working_directory: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="sessions")
    runs: Mapped[list["Run"]] = relationship("Run", back_populates="session", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        Index("ix_session_workspace_created", "workspace_id", "created_at"),
        Index("ix_session_tenant", "tenant_id"),
    )


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    runner_run_id: Mapped[str] = mapped_column(Text, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="running")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="runs")
    events: Mapped[list["RunEvent"]] = relationship("RunEvent", back_populates="run", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        Index("ix_run_session_created", "session_id", "created_at"),
        Index("ix_run_tenant", "tenant_id"),
    )


class RunEvent(Base):
    __tablename__ = "run_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    seq: Mapped[int] = mapped_column(nullable=False)
    at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="runner")
    event_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    run: Mapped["Run"] = relationship("Run", back_populates="events")

    __table_args__ = (
        UniqueConstraint("run_id", "seq", name="uq_run_event_seq"),
        Index("ix_run_event_run_seq", "run_id", "seq"),
    )


class Message(Base):
    """Chat messages for conversation persistence."""
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    run_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="SET NULL"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, tool, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # tool_name, tool_input, tool_output
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        Index("ix_message_session_created", "session_id", "created_at"),
    )


class User(Base):
    """User accounts for authentication and RBAC."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, active, inactive, rejected
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="editor")  # super_admin, org_admin, project_admin, editor, viewer
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    approved_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant", back_populates="users")

    __table_args__ = (
        Index("ix_user_status", "status"),
        Index("ix_user_role", "role"),
        Index("ix_user_tenant", "tenant_id"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# v0.5.0 RBAC Models
# ─────────────────────────────────────────────────────────────────────────────

class Tenant(Base):
    """NHS Trust organizations for multi-tenancy."""
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active, inactive
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    groups: Mapped[list["Group"]] = relationship("Group", back_populates="tenant")


class Group(Base):
    """User groups within a tenant for RBAC."""
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="groups")
    members: Mapped[list["UserGroup"]] = relationship("UserGroup", back_populates="group")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_group_tenant_name"),
        Index("ix_group_tenant", "tenant_id"),
    )


class UserGroup(Base):
    """User-group membership for RBAC."""
    __tablename__ = "user_groups"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")  # member, admin
    added_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    added_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    group: Mapped["Group"] = relationship("Group", back_populates="members")


class WorkspaceAccess(Base):
    """Workspace access grants for RBAC."""
    __tablename__ = "workspace_access"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    grantee_type: Mapped[str] = mapped_column(String(20), nullable=False)  # user, group
    grantee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    access_level: Mapped[str] = mapped_column(String(20), nullable=False)  # owner, editor, viewer
    granted_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=utcnow)
    granted_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("workspace_id", "grantee_type", "grantee_id", name="uq_workspace_access_grantee"),
        Index("ix_workspace_access_workspace", "workspace_id"),
        Index("ix_workspace_access_grantee", "grantee_type", "grantee_id"),
    )
