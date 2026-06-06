"""Pydantic schemas for authentication."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    mobile: Optional[str] = None
    password: str = Field(min_length=8)
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    """User login request."""
    email: str  # login identifier: an email OR a plain username (e.g. "superadmin")
    password: str


class UserResponse(BaseModel):
    """User response (public fields only)."""
    id: UUID
    tenant_id: Optional[UUID] = None
    email: str
    mobile: Optional[str] = None
    display_name: Optional[str] = None
    status: str
    role: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response with token."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user id
    email: str
    role: str
    exp: datetime
