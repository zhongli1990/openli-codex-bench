"""Admin API endpoints for user management."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..auth.dependencies import require_admin, require_super_admin
from ..auth.rbac import is_super_admin
from ..auth.schemas import UserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List users. Super admin sees all; org_admin sees own tenant only."""
    query = select(User).order_by(User.created_at.desc())
    if status_filter:
        query = query.where(User.status == status_filter)
    # Org admins only see users in their own tenant
    if not is_super_admin(admin) and admin.tenant_id:
        query = query.where(User.tenant_id == admin.tenant_id)
    
    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.get("/users/pending", response_model=list[UserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List users pending approval."""
    query = select(User).where(User.status == "pending").order_by(User.created_at.asc())
    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get a specific user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/users/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Approve a pending user registration."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is not pending (current status: {user.status})"
        )
    
    user.status = "active"
    user.approved_at = datetime.now(timezone.utc)
    user.approved_by = admin.id
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/users/{user_id}/reject", response_model=UserResponse)
async def reject_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Reject a pending user registration."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is not pending (current status: {user.status})"
        )
    
    user.status = "rejected"
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Deactivate an active user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )
    
    user.status = "inactive"
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Reactivate an inactive or rejected user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    user.status = "active"
    if user.approved_at is None:
        user.approved_at = datetime.now(timezone.utc)
        user.approved_by = admin.id
    await db.commit()
    await db.refresh(user)
    
    return user


VALID_ROLES = ("super_admin", "org_admin", "project_admin", "editor", "viewer")


@router.post("/users/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    user_id: UUID,
    role: str = Query(..., description="New role"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Change a user's role. Super Admin can set any role. Org Admin can set roles below org_admin."""
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    # Org admins cannot promote to super_admin or org_admin
    is_super = admin.role in ("admin", "super_admin")
    if not is_super and role in ("super_admin", "org_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can assign super_admin or org_admin roles"
        )
    
    user.role = role
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/users/{user_id}/tenant", response_model=UserResponse)
async def assign_user_tenant(
    user_id: UUID,
    tenant_id: Optional[UUID] = Query(None, description="Tenant ID (null to remove)"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Assign a user to a tenant."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if tenant_id is not None:
        from ..models import Tenant
        t = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        if t.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    user.tenant_id = tenant_id
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    
    return user


# ─── Tenant Management ───

@router.get("/tenants")
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all tenants."""
    from ..models import Tenant
    result = await db.execute(select(Tenant).order_by(Tenant.name))
    tenants = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "slug": t.slug,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tenants
    ]


@router.get("/groups")
async def list_groups(
    tenant_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all groups, optionally filtered by tenant."""
    from ..models import Group
    query = select(Group).order_by(Group.name)
    if tenant_id:
        query = query.where(Group.tenant_id == tenant_id)
    result = await db.execute(query)
    groups = result.scalars().all()
    return [
        {
            "id": str(g.id),
            "tenant_id": str(g.tenant_id),
            "name": g.name,
            "description": g.description,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        }
        for g in groups
    ]


@router.get("/rbac/summary")
async def rbac_summary(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get RBAC summary: users by role, tenants, groups."""
    from ..models import Tenant, Group, UserGroup
    from sqlalchemy import func
    
    # Users by role
    role_counts = await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    )
    roles = {row[0]: row[1] for row in role_counts}
    
    # Tenant count
    tenant_count = await db.execute(select(func.count(Tenant.id)))
    
    # Group count
    group_count = await db.execute(select(func.count(Group.id)))
    
    return {
        "roles": roles,
        "tenant_count": tenant_count.scalar() or 0,
        "group_count": group_count.scalar() or 0,
        "valid_roles": list(VALID_ROLES),
    }
