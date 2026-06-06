# v0.4.0 Authentication & RBAC Implementation Plan

> **Status**: ✅ IMPLEMENTED (Jan 18, 2026)
> **Target Release**: v0.4.0
> **Actual Duration**: 1 day
> **Branch**: `user-management`
> **Related Documents**:
> - `v0.4.0_Auth_RBAC_Requirements.md`
> - `v0.4.0_Auth_RBAC_Design.md`

---

## 1. Implementation Phases

### Phase 1: Database & Models (Day 1 - Morning)

| Task | Description | Effort |
|------|-------------|--------|
| 1.1 | Create `User` SQLAlchemy model in `backend/app/models.py` | 30 min |
| 1.2 | Create Alembic migration `002_add_users_table.py` | 30 min |
| 1.3 | Run migration and verify table creation | 15 min |
| 1.4 | Add initial admin user creation on startup | 30 min |

**Deliverables**:
- `backend/app/models.py` - User model added
- `backend/alembic/versions/002_add_users_table.py` - Migration file
- `backend/app/main.py` - Initial admin creation on startup

---

### Phase 2: Backend Auth Module (Day 1 - Afternoon)

| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | Create `backend/app/auth/` module structure | 15 min |
| 2.2 | Implement `security.py` - JWT, password hashing | 45 min |
| 2.3 | Implement `schemas.py` - Pydantic models | 30 min |
| 2.4 | Implement `dependencies.py` - get_current_user, require_admin | 30 min |
| 2.5 | Implement `service.py` - business logic | 45 min |
| 2.6 | Implement `router.py` - auth endpoints | 1 hour |
| 2.7 | Add router to main.py | 15 min |

**Deliverables**:
- `backend/app/auth/__init__.py`
- `backend/app/auth/security.py`
- `backend/app/auth/schemas.py`
- `backend/app/auth/dependencies.py`
- `backend/app/auth/service.py`
- `backend/app/auth/router.py`

**Endpoints**:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

---

### Phase 3: Backend Admin Module (Day 2 - Morning)

| Task | Description | Effort |
|------|-------------|--------|
| 3.1 | Create `backend/app/admin/` module structure | 15 min |
| 3.2 | Implement `schemas.py` - Admin Pydantic models | 20 min |
| 3.3 | Implement `router.py` - admin endpoints | 1 hour |
| 3.4 | Add router to main.py | 15 min |
| 3.5 | Test all admin endpoints with curl/Postman | 30 min |

**Deliverables**:
- `backend/app/admin/__init__.py`
- `backend/app/admin/schemas.py`
- `backend/app/admin/router.py`

**Endpoints**:
- `GET /api/admin/users`
- `GET /api/admin/users/pending`
- `POST /api/admin/users/{id}/approve`
- `POST /api/admin/users/{id}/reject`
- `POST /api/admin/users/{id}/deactivate`

---

### Phase 4: Frontend Auth Context & Middleware (Day 2 - Afternoon)

| Task | Description | Effort |
|------|-------------|--------|
| 4.1 | Create `AuthContext.tsx` with user state | 45 min |
| 4.2 | Create `lib/auth.ts` - API helper functions | 30 min |
| 4.3 | Create Next.js middleware for protected routes | 45 min |
| 4.4 | Update `layout.tsx` to wrap with AuthProvider | 15 min |
| 4.5 | Create frontend API proxy routes for auth | 30 min |

**Deliverables**:
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/lib/auth.ts`
- `frontend/src/middleware.ts`
- `frontend/src/app/api/auth/[...path]/route.ts`

---

### Phase 5: Frontend Auth Pages (Day 3 - Morning)

| Task | Description | Effort |
|------|-------------|--------|
| 5.1 | Create Login page `/login` | 1 hour |
| 5.2 | Create Register page `/register` | 1 hour |
| 5.3 | Create Pending page `/pending` | 30 min |
| 5.4 | Style all pages with dark mode support | 30 min |
| 5.5 | Add form validation and error handling | 30 min |

**Deliverables**:
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/app/(auth)/pending/page.tsx`
- `frontend/src/app/(auth)/layout.tsx`

---

### Phase 6: Frontend Admin Panel (Day 3 - Afternoon)

| Task | Description | Effort |
|------|-------------|--------|
| 6.1 | Create Admin Users page `/admin/users` | 1.5 hours |
| 6.2 | Implement pending users list with approve/reject | 1 hour |
| 6.3 | Add admin link to sidebar (conditional) | 30 min |
| 6.4 | Style with dark mode support | 30 min |

**Deliverables**:
- `frontend/src/app/(app)/admin/users/page.tsx`
- `frontend/src/components/Sidebar.tsx` - Admin link

---

### Phase 7: Integration & Testing (Day 4)

| Task | Description | Effort |
|------|-------------|--------|
| 7.1 | End-to-end testing of registration flow | 1 hour |
| 7.2 | End-to-end testing of login flow | 30 min |
| 7.3 | End-to-end testing of admin approval flow | 1 hour |
| 7.4 | Test protected routes (logged out redirect) | 30 min |
| 7.5 | Test admin-only routes (non-admin redirect) | 30 min |
| 7.6 | Fix any bugs found during testing | 2 hours |
| 7.7 | Update documentation | 1 hour |

**Deliverables**:
- All flows working end-to-end
- Updated documentation

---

## 2. File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `backend/alembic/versions/002_add_users_table.py` | Migration |
| `backend/app/auth/__init__.py` | Auth module |
| `backend/app/auth/security.py` | JWT, password hashing |
| `backend/app/auth/schemas.py` | Pydantic models |
| `backend/app/auth/dependencies.py` | FastAPI dependencies |
| `backend/app/auth/service.py` | Business logic |
| `backend/app/auth/router.py` | Auth endpoints |
| `backend/app/admin/__init__.py` | Admin module |
| `backend/app/admin/schemas.py` | Admin Pydantic models |
| `backend/app/admin/router.py` | Admin endpoints |
| `frontend/src/contexts/AuthContext.tsx` | Auth state |
| `frontend/src/lib/auth.ts` | Auth helpers |
| `frontend/src/middleware.ts` | Route protection |
| `frontend/src/app/(auth)/login/page.tsx` | Login page |
| `frontend/src/app/(auth)/register/page.tsx` | Register page |
| `frontend/src/app/(auth)/pending/page.tsx` | Pending page |
| `frontend/src/app/(auth)/layout.tsx` | Auth layout |
| `frontend/src/app/(app)/admin/users/page.tsx` | Admin panel |
| `frontend/src/app/api/auth/[...path]/route.ts` | Auth proxy |

### Modified Files

| File | Changes |
|------|---------|
| `backend/app/models.py` | Add User model |
| `backend/app/main.py` | Include auth/admin routers, initial admin |
| `backend/requirements.txt` | Add python-jose, passlib |
| `frontend/src/components/Sidebar.tsx` | Add Admin link |
| `frontend/src/app/layout.tsx` | Wrap with AuthProvider |

---

## 3. Dependencies to Add

### Backend (requirements.txt)

```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

### Frontend (package.json)

No new dependencies required (using existing fetch API).

---

## 4. Environment Variables

Add to `.env` and `docker-compose.yml`:

```bash
JWT_SECRET_KEY=generate-a-256-bit-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
ADMIN_EMAIL=admin@saas-codex.com
ADMIN_PASSWORD=ChangeThisPassword123!
```

---

## 5. Testing Checklist

### Registration Flow
- [x] User can access register page
- [x] Form validates email format
- [x] Form validates password requirements
- [x] Duplicate email shows error
- [x] Successful registration redirects to pending page
- [x] User status is "pending" in database

### Login Flow
- [x] User can access login page
- [x] Invalid credentials show error
- [x] Pending user cannot login (shows message)
- [x] Active user can login
- [x] Successful login redirects to dashboard
- [x] JWT token is stored correctly

### Admin Approval Flow
- [x] Admin can access user management page
- [x] Non-admin cannot access user management
- [x] Pending users are listed
- [x] Approve button activates user
- [x] Reject button rejects user
- [x] Approved user can now login

### Protected Routes
- [x] Unauthenticated user redirected to login (AuthGuard)
- [x] Authenticated user can access all pages
- [x] Non-admin redirected from admin pages (AuthGuard)
- [x] Logout clears session and redirects

---

## 6. Rollback Plan

If issues are found after deployment:

1. Revert to previous Docker images
2. Keep users table (no data loss)
3. Disable auth middleware temporarily
4. Fix issues and redeploy

---

## 7. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Registration works | User can self-register |
| Admin approval works | Admin can approve/reject |
| Login works | Approved user can login |
| Routes protected | Unauthenticated users redirected |
| Admin routes protected | Non-admins cannot access |
| Dark mode works | All new pages support dark mode |

---

## 8. Implementation Summary

### Completed (Jan 18, 2026)

All phases implemented successfully in a single day:

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Database & Models | ✅ Complete | User model, migration 002 |
| Phase 2: Backend Auth Module | ✅ Complete | JWT, bcrypt, auth endpoints |
| Phase 3: Backend Admin Module | ✅ Complete | User management endpoints |
| Phase 4: Frontend Auth Context | ✅ Complete | AuthContext, lib/auth.ts |
| Phase 5: Frontend Auth Pages | ✅ Complete | Login, Register, Pending |
| Phase 6: Frontend Admin Panel | ✅ Complete | User management UI |
| Phase 7: Integration & Testing | ✅ Complete | E2E tested, bugs fixed |

### Deviations from Plan

1. **Used bcrypt directly** instead of passlib due to compatibility issues with Python 3.12
2. **Skipped service.py** - business logic integrated directly into router.py for simplicity
3. **Added AuthGuard component** - client-side route protection instead of Next.js middleware

### Files Created

| File | Description |
|------|-------------|
| `backend/alembic/versions/002_add_users_table.py` | Migration |
| `backend/app/auth/__init__.py` | Auth module |
| `backend/app/auth/security.py` | JWT, bcrypt |
| `backend/app/auth/schemas.py` | Pydantic models |
| `backend/app/auth/dependencies.py` | FastAPI deps |
| `backend/app/auth/router.py` | Auth endpoints |
| `backend/app/admin/__init__.py` | Admin module |
| `backend/app/admin/router.py` | Admin endpoints |
| `frontend/src/lib/auth.ts` | Auth helpers |
| `frontend/src/contexts/AuthContext.tsx` | Auth state |
| `frontend/src/app/(auth)/layout.tsx` | Auth layout |
| `frontend/src/app/(auth)/login/page.tsx` | Login page |
| `frontend/src/app/(auth)/register/page.tsx` | Register page |
| `frontend/src/app/(auth)/pending/page.tsx` | Pending page |
| `frontend/src/app/(app)/admin/users/page.tsx` | Admin panel |
| `frontend/src/app/api/auth/[...path]/route.ts` | Auth proxy |
| `frontend/src/app/api/admin/[...path]/route.ts` | Admin proxy |
| `frontend/src/components/AuthGuard.tsx` | Route protection |
| `frontend/src/middleware.ts` | Next.js middleware |

### Commits

| Commit | Description |
|--------|-------------|
| `437793c` | feat(v0.4.0): Implement user authentication and RBAC |
| `41e3ab4` | docs: Update all MD documentation with v0.4.0 status |
| `41e7725` | fix: TopNav user display and add route protection |

### Release

- **Tag**: `v0.4.0`
- **Branch**: Merged `user-management` → `main`
- **Date**: Jan 18, 2026

---

*Document Version: 3.0*
*Created: Jan 18, 2026*
*Updated: Jan 18, 2026*
*Author: Cascade AI Assistant*
