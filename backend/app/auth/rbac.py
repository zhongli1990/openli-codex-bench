"""
OpenLi Codex - Enterprise AI Agent Platform
Copyright (c) 2026 Lightweight Integration Ltd

This file is part of OpenLi Codex.
Licensed under AGPL-3.0 (community) or Commercial license.
See LICENSE file for details.

Contact: Zhong@li-ai.co.uk

RBAC (Role-Based Access Control) middleware and utilities.
v0.7.0 — Resource Ownership Model with tenant-scoped filtering.
"""

from enum import Enum
from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, UserGroup, WorkspaceAccess, Group
from .dependencies import get_current_user


# ---------------------------------------------------------------------------
# Role hierarchy: higher number = more privileges
# ---------------------------------------------------------------------------
ROLE_HIERARCHY = {
    "super_admin": 5,
    "admin": 5,        # legacy alias
    "org_admin": 4,
    "project_admin": 3,
    "editor": 2,
    "viewer": 1,
}

VALID_ROLES = ("super_admin", "org_admin", "project_admin", "editor", "viewer")


# ---------------------------------------------------------------------------
# Role check helpers
# ---------------------------------------------------------------------------
def is_super_admin(user: User) -> bool:
    """Check if user is a Super Admin (platform owner)."""
    return user.role in ("admin", "super_admin")


def has_min_role(user: User, min_role: str) -> bool:
    """Check if user's role meets or exceeds the minimum role level."""
    return ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)


def role_level(role: str) -> int:
    """Return numeric level for a role string."""
    return ROLE_HIERARCHY.get(role, 0)


# ---------------------------------------------------------------------------
# Tenant-scoped query filter  (THE core RBAC pattern)
# ---------------------------------------------------------------------------
def tenant_filter(query, model, user: User):
    """Apply tenant scoping to any SQLAlchemy Select.

    - super_admin: no filter (sees everything across all tenants)
    - others: resource.tenant_id = user.tenant_id OR resource.tenant_id IS NULL
    """
    if is_super_admin(user):
        return query  # No restriction
    return query.where(
        or_(
            model.tenant_id == user.tenant_id,
            model.tenant_id.is_(None),
        )
    )


def owner_or_admin_filter(query, model, user: User):
    """For write/delete: super_admin + org_admin see all in scope,
    others only see their own resources."""
    if is_super_admin(user):
        return query
    if has_min_role(user, "org_admin"):
        # org_admin can manage any resource in their tenant
        return query.where(
            or_(
                model.tenant_id == user.tenant_id,
                model.tenant_id.is_(None),
            )
        )
    # editor / project_admin / viewer — own resources only
    return query.where(model.owner_id == user.id)


# ---------------------------------------------------------------------------
# Permission enum (for fine-grained checks when needed)
# ---------------------------------------------------------------------------
class Permission(Enum):
    # Platform-level (Super Admin only)
    MANAGE_TENANTS = "manage_tenants"
    MANAGE_ALL_USERS = "manage_all_users"
    MANAGE_PLATFORM_SKILLS = "manage_platform_skills"
    MANAGE_PLATFORM_HOOKS = "manage_platform_hooks"
    VIEW_ALL_TENANTS = "view_all_tenants"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    # Tenant-level (Org Admin)
    MANAGE_TENANT_USERS = "manage_tenant_users"
    MANAGE_TENANT_SKILLS = "manage_tenant_skills"
    MANAGE_TENANT_HOOKS = "manage_tenant_hooks"
    MANAGE_TENANT_GROUPS = "manage_tenant_groups"
    VIEW_TENANT_USERS = "view_tenant_users"
    # Workspace-level
    MANAGE_PROJECT_SKILLS = "manage_project_skills"
    MANAGE_WORKSPACE = "manage_workspace"
    EDIT_WORKSPACE = "edit_workspace"
    VIEW_WORKSPACE = "view_workspace"
    RUN_PROMPTS = "run_prompts"


# ---------------------------------------------------------------------------
# FastAPI dependency factories
# ---------------------------------------------------------------------------
def require_role(min_role: str):
    """Dependency factory: require at least `min_role` level."""
    async def _dep(user: User = Depends(get_current_user)) -> User:
        if not has_min_role(user, min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {min_role} role or higher",
            )
        return user
    return _dep


async def require_super_admin_dep(
    user: User = Depends(get_current_user),
) -> User:
    if not is_super_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
    return user


async def require_org_admin_dep(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if is_super_admin(user):
        return user
    if user.role == "org_admin":
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Organization Admin access required",
    )


async def get_workspace_access_level(
    user: User,
    workspace_id: UUID,
    db: AsyncSession,
) -> Optional[str]:
    """Get user's access level for a workspace."""
    if is_super_admin(user):
        return "owner"

    result = await db.execute(
        select(WorkspaceAccess).where(
            WorkspaceAccess.workspace_id == workspace_id,
            WorkspaceAccess.grantee_type == "user",
            WorkspaceAccess.grantee_id == user.id,
        )
    )
    access = result.scalar_one_or_none()
    if access:
        return access.access_level

    user_groups_result = await db.execute(
        select(UserGroup).where(UserGroup.user_id == user.id)
    )
    for ug in user_groups_result.scalars().all():
        result = await db.execute(
            select(WorkspaceAccess).where(
                WorkspaceAccess.workspace_id == workspace_id,
                WorkspaceAccess.grantee_type == "group",
                WorkspaceAccess.grantee_id == ug.group_id,
            )
        )
        access = result.scalar_one_or_none()
        if access:
            return access.access_level

    return None


class PermissionChecker:
    """Dependency class for checking specific permissions."""
    def __init__(self, permission: Permission):
        self.permission = permission

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if is_super_admin(user):
            return user
        # Map permissions to minimum role levels
        perm_role_map = {
            Permission.MANAGE_TENANTS: "super_admin",
            Permission.MANAGE_ALL_USERS: "super_admin",
            Permission.MANAGE_PLATFORM_SKILLS: "super_admin",
            Permission.MANAGE_PLATFORM_HOOKS: "super_admin",
            Permission.VIEW_ALL_TENANTS: "super_admin",
            Permission.VIEW_AUDIT_LOGS: "super_admin",
            Permission.MANAGE_TENANT_USERS: "org_admin",
            Permission.MANAGE_TENANT_SKILLS: "org_admin",
            Permission.MANAGE_TENANT_HOOKS: "org_admin",
            Permission.MANAGE_TENANT_GROUPS: "org_admin",
            Permission.VIEW_TENANT_USERS: "org_admin",
            Permission.MANAGE_PROJECT_SKILLS: "project_admin",
            Permission.MANAGE_WORKSPACE: "project_admin",
            Permission.EDIT_WORKSPACE: "editor",
            Permission.VIEW_WORKSPACE: "viewer",
            Permission.RUN_PROMPTS: "editor",
        }
        min_role = perm_role_map.get(self.permission, "super_admin")
        if not has_min_role(user, min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission.value}",
            )
        return user


# Convenience dependencies
require_manage_platform_skills = PermissionChecker(Permission.MANAGE_PLATFORM_SKILLS)
require_manage_tenant_skills = PermissionChecker(Permission.MANAGE_TENANT_SKILLS)
require_manage_project_skills = PermissionChecker(Permission.MANAGE_PROJECT_SKILLS)
require_manage_platform_hooks = PermissionChecker(Permission.MANAGE_PLATFORM_HOOKS)
require_manage_tenant_hooks = PermissionChecker(Permission.MANAGE_TENANT_HOOKS)
