"""JWT authentication middleware for prompt-manager.

Validates the same JWT tokens as the main backend service.
Extracts user_id, tenant_id, and role from the token.
"""
import os
from typing import Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


class CurrentUser:
    """Lightweight user object extracted from JWT."""
    def __init__(self, user_id: str, email: str, role: str, tenant_id: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.tenant_id = tenant_id

    @property
    def is_admin(self) -> bool:
        return self.role in ("admin", "super_admin", "org_admin")

    @property
    def is_super_admin(self) -> bool:
        return self.role in ("admin", "super_admin")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    """Extract and validate JWT token, return CurrentUser."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email", "")
        role: str = payload.get("role", "user")
        tenant_id: Optional[str] = payload.get("tenant_id")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )

        return CurrentUser(
            user_id=user_id,
            email=email,
            role=role,
            tenant_id=tenant_id,
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[CurrentUser]:
    """Like get_current_user but returns None if no token provided."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency that requires admin role."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
