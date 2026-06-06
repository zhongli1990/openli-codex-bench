# v0.4.0 Authentication & RBAC Design

> **Status**: ✅ IMPLEMENTED (Jan 18, 2026)
> **Target Release**: v0.4.0
> **Branch**: `user-management`
> **Related**: `v0.4.0_Auth_RBAC_Requirements.md`

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser (User)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js) :9100                             │
│  - Login / Register pages                                                    │
│  - Protected route middleware                                                │
│  - JWT token storage (httpOnly cookie or localStorage)                       │
│  - Auth context provider                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI) :9101                              │
│  - Auth endpoints (/api/auth/*)                                              │
│  - Admin endpoints (/api/admin/*)                                            │
│  - JWT middleware for protected routes                                       │
│  - Password hashing with bcrypt                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL :9103                                     │
│  - users table                                                               │
│  - (future: roles, user_roles tables)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Frontend │     │ Backend  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Register   │                │                │
     │───────────────>│                │                │
     │                │  2. POST /auth/register         │
     │                │───────────────>│                │
     │                │                │  3. Insert user (pending)
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │<───────────────│                │
     │  4. "Pending"  │                │                │
     │<───────────────│                │                │
     │                │                │                │
     │  5. Admin approves              │                │
     │                │                │  6. Update status=active
     │                │                │───────────────>│
     │                │                │                │
     │  7. Login      │                │                │
     │───────────────>│                │                │
     │                │  8. POST /auth/login            │
     │                │───────────────>│                │
     │                │                │  9. Verify password
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │  10. JWT token │                │
     │                │<───────────────│                │
     │  11. Dashboard │                │                │
     │<───────────────│                │                │
```

---

## 2. Database Design

### 2.1 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_status CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
    CONSTRAINT chk_role CHECK (role IN ('admin', 'user'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### 2.2 SQLAlchemy Model

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    mobile = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    role = Column(String(20), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
```

### 2.3 Migration

New Alembic migration: `002_add_users_table.py`

---

## 3. Backend Design

### 3.1 Authentication Module Structure

```
backend/app/
├── auth/
│   ├── __init__.py
│   ├── router.py          # Auth endpoints
│   ├── schemas.py         # Pydantic models
│   ├── service.py         # Business logic
│   ├── security.py        # JWT, password hashing
│   └── dependencies.py    # FastAPI dependencies
├── admin/
│   ├── __init__.py
│   ├── router.py          # Admin endpoints
│   └── schemas.py         # Admin Pydantic models
└── main.py                # Include routers
```

### 3.2 Security Module

```python
# backend/app/auth/security.py

from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

### 3.3 Auth Dependencies

```python
# backend/app/auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.get(User, user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

### 3.4 API Schemas

```python
# backend/app/auth/schemas.py

class RegisterRequest(BaseModel):
    email: EmailStr
    mobile: str | None = None
    password: str = Field(min_length=8)
    display_name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    status: str
    role: str
    created_at: datetime
```

### 3.5 Auth Router

```python
# backend/app/auth/router.py

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    # Hash password
    # Create user with status="pending"
    # Return user

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Find user by email
    # Verify password
    # Check status == "active"
    # Create JWT token
    # Return token + user

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user

@router.post("/logout")
async def logout():
    # For JWT, logout is client-side (delete token)
    return {"message": "Logged out"}
```

### 3.6 Admin Router

```python
# backend/app/admin/router.py

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Return all users, optionally filtered by status

@router.get("/users/pending", response_model=list[UserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Return users with status="pending"

@router.post("/users/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Set status="active", approved_at, approved_by

@router.post("/users/{user_id}/reject", response_model=UserResponse)
async def reject_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Set status="rejected"
```

---

## 4. Frontend Design

### 4.1 New Components Structure

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── pending/page.tsx
│   ├── (app)/
│   │   ├── admin/
│   │   │   └── users/page.tsx
│   │   └── ... (existing pages)
│   └── layout.tsx
├── contexts/
│   └── AuthContext.tsx
├── components/
│   └── ProtectedRoute.tsx
└── lib/
    └── auth.ts
```

### 4.2 Auth Context

```typescript
// frontend/src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and validate
    checkAuth();
  }, []);

  // ... implementation
}
```

### 4.3 Protected Route Middleware

```typescript
// frontend/src/middleware.ts

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/register");

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 4.4 Login Page UI

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      🚀 saas-codex                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Email                                              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ user@example.com                            │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Password                                           │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ ••••••••                                    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              Sign In                        │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Don't have an account? Register                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Admin Users Page UI

```
┌─────────────────────────────────────────────────────────────┐
│  User Management                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Pending (3)  │  Active (12)  │  All (15)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Email              │ Name     │ Status  │ Actions   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ john@example.com   │ John Doe │ Pending │ ✓ ✗       │   │
│  │ jane@example.com   │ Jane Doe │ Pending │ ✓ ✗       │   │
│  │ bob@example.com    │ Bob      │ Active  │ 🚫        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Security Considerations

### 5.1 Token Storage

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| localStorage | Simple | XSS vulnerable | Not recommended |
| httpOnly Cookie | XSS safe | CSRF vulnerable | Recommended with CSRF token |
| Memory + Refresh | Most secure | Complex | Future consideration |

**Decision**: Use httpOnly cookies with SameSite=Strict for v0.4.0.

### 5.2 Password Requirements

```python
def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True
```

### 5.3 Rate Limiting

```python
# Apply to auth endpoints
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

---

## 6. Environment Variables

```bash
# Add to .env
JWT_SECRET_KEY=your-256-bit-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # 24 hours
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=initial-admin-password
```

---

## 7. Initial Admin Setup

On first startup, create a default admin user:

```python
async def create_initial_admin(db: AsyncSession):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    
    existing = await db.execute(select(User).where(User.email == admin_email))
    if existing.scalar_one_or_none() is None:
        admin = User(
            email=admin_email,
            password_hash=get_password_hash(admin_password),
            display_name="Administrator",
            status="active",
            role="admin"
        )
        db.add(admin)
        await db.commit()
```

---

## 8. Testing Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit Tests | Password hashing, JWT creation/validation |
| Integration Tests | Auth endpoints, database operations |
| E2E Tests | Login flow, registration flow, admin approval |

---

## 9. Implementation Notes

### 9.1 Deviations from Design

| Design | Implementation | Reason |
|--------|----------------|--------|
| passlib for bcrypt | bcrypt library directly | passlib compatibility issues with Python 3.12 |
| httpOnly cookies | localStorage | Simpler implementation for v0.4.0 |
| service.py layer | Logic in router.py | Reduced complexity for initial implementation |
| Rate limiting | Not implemented | Deferred to v0.5.0 |
| Next.js middleware | API-level checks | Simpler implementation |

### 9.2 Actual File Structure

```
backend/app/
├── auth/
│   ├── __init__.py
│   ├── router.py          # Auth endpoints
│   ├── schemas.py         # Pydantic models
│   ├── security.py        # JWT, bcrypt
│   └── dependencies.py    # FastAPI dependencies
├── admin/
│   ├── __init__.py
│   └── router.py          # Admin endpoints
└── main.py                # Include routers

frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── pending/page.tsx
│   ├── (app)/admin/users/page.tsx
│   └── api/
│       ├── auth/[...path]/route.ts
│       └── admin/[...path]/route.ts
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── auth.ts
└── components/
    └── Sidebar.tsx        # Updated with admin section
```

### 9.3 Testing Status

| Test | Status |
|------|--------|
| Registration flow | ✅ Complete |
| Login flow | ✅ Complete |
| Admin approval | ✅ Complete |
| Protected routes | ✅ Complete (AuthGuard) |
| E2E testing | ✅ Complete |

### 9.4 Release Info

- **Tag**: `v0.4.0`
- **Branch**: Merged `user-management` → `main`
- **Date**: Jan 18, 2026

---

## 10. v0.5.0 RBAC Extensions

The v0.4.0 implementation provides basic user authentication and admin/user roles. v0.5.0 extends this with:

### 10.1 Multi-Tenancy Model

```
Tenant (NHS Trust)
    │
    ├── Users (belong to one tenant)
    ├── Groups (for team-based access)
    └── Workspaces (owned by users, shared with groups)
```

### 10.2 New Tables (v0.5.0)

| Table | Purpose |
|-------|---------|
| `tenants` | NHS Trust organizations |
| `groups` | User groups within a tenant |
| `user_groups` | User-group membership |
| `workspace_access` | Workspace sharing grants |

### 10.3 Permission Model

| Permission | Admin | User | Viewer |
|------------|-------|------|--------|
| `workspace:create` | ✅ | ✅ | ❌ |
| `workspace:delete` | ✅ | Owner | ❌ |
| `files:browse` | ✅ | ✅ | ✅ |
| `files:download` | ✅ | ✅ | ✅ |
| `files:upload` | ✅ | ✅ | ❌ |

See `v0.5.0_Upload_FileBrowser_Design.md` for full RBAC specification.

---

*Document Version: 4.0*
*Created: Jan 18, 2026*
*Updated: Feb 6, 2026 (v0.5.0 RBAC extensions)*
*Author: Cascade AI Assistant*
