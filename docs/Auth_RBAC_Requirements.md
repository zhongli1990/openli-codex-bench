# v0.4.0 Authentication & RBAC Requirements

> **Status**: ✅ IMPLEMENTED (Jan 18, 2026)
> **Target Release**: v0.4.0
> **Actual Effort**: 1 day
> **Branch**: `user-management`

---

## 1. Executive Summary

This document defines the requirements for implementing user authentication and role-based access control (RBAC) in saas-codex. The goal is to enable secure multi-user access with admin-controlled user registration approval.

---

## 2. Business Requirements

### 2.1 User Registration Flow

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **REQ-001** | Users can self-register with email and mobile number | High |
| **REQ-002** | Registration creates a "pending" user awaiting admin approval | High |
| **REQ-003** | Users receive feedback that their registration is pending | High |
| **REQ-004** | Email/mobile must be unique across all users | High |
| **REQ-005** | Password must meet minimum security requirements | High |

### 2.2 Admin Approval Flow

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **REQ-006** | Admin can view list of pending registration requests | High |
| **REQ-007** | Admin can approve pending registrations | High |
| **REQ-008** | Admin can reject pending registrations | High |
| **REQ-009** | Approved users can immediately log in | High |
| **REQ-010** | Rejected users are notified (optional email) | Medium |

### 2.3 Authentication

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **REQ-011** | Users log in with email and password | High |
| **REQ-012** | JWT tokens for session management | High |
| **REQ-013** | Token expiration and refresh mechanism | High |
| **REQ-014** | Secure password hashing (bcrypt) | High |
| **REQ-015** | Logout invalidates session | High |

### 2.4 Role-Based Access Control

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **REQ-016** | Two initial roles: `admin` and `user` | High |
| **REQ-017** | Admin can manage users (view, approve, deactivate) | High |
| **REQ-018** | Regular users can only access their own workspaces | Medium |
| **REQ-019** | Protected routes require authentication | High |
| **REQ-020** | Admin-only routes require admin role | High |

---

## 3. Functional Requirements

### 3.1 User Entity

```
User:
  - id: UUID (primary key)
  - email: string (unique, required)
  - mobile: string (optional)
  - password_hash: string (required)
  - display_name: string (optional)
  - status: enum (pending, active, inactive, rejected)
  - role: enum (admin, user)
  - created_at: timestamp
  - updated_at: timestamp
  - approved_at: timestamp (nullable)
  - approved_by: UUID (nullable, references User)
```

### 3.2 API Endpoints

#### Authentication Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | User self-registration | No |
| `/api/auth/login` | POST | User login, returns JWT | No |
| `/api/auth/logout` | POST | Invalidate session | Yes |
| `/api/auth/me` | GET | Get current user info | Yes |
| `/api/auth/refresh` | POST | Refresh JWT token | Yes |

#### Admin Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/admin/users` | GET | List all users | Admin |
| `/api/admin/users/pending` | GET | List pending registrations | Admin |
| `/api/admin/users/{id}/approve` | POST | Approve registration | Admin |
| `/api/admin/users/{id}/reject` | POST | Reject registration | Admin |
| `/api/admin/users/{id}/deactivate` | POST | Deactivate user | Admin |

### 3.3 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password login form |
| Register | `/register` | Self-registration form |
| Pending | `/pending` | "Awaiting approval" message |
| Admin Users | `/admin/users` | User management panel |

### 3.4 Protected Routes

All existing routes (`/dashboard`, `/projects`, `/codex`, `/chat`, `/settings`) require authentication.

---

## 4. Non-Functional Requirements

### 4.1 Security

| Requirement | Description |
|-------------|-------------|
| **NFR-001** | Passwords hashed with bcrypt (cost factor 12) |
| **NFR-002** | JWT tokens signed with HS256 or RS256 |
| **NFR-003** | Token expiration: 24 hours (configurable) |
| **NFR-004** | HTTPS required in production |
| **NFR-005** | Rate limiting on auth endpoints |

### 4.2 Password Policy

| Requirement | Description |
|-------------|-------------|
| **NFR-006** | Minimum 8 characters |
| **NFR-007** | At least one uppercase letter |
| **NFR-008** | At least one lowercase letter |
| **NFR-009** | At least one number |
| **NFR-010** | At least one special character (optional) |

### 4.3 Performance

| Requirement | Description |
|-------------|-------------|
| **NFR-011** | Login response < 500ms |
| **NFR-012** | Token validation < 50ms |

---

## 5. User Stories

### 5.1 New User Registration

```
As a new user,
I want to register with my email and mobile number,
So that I can request access to the platform.

Acceptance Criteria:
- I can enter email, mobile, password, and display name
- I see validation errors for invalid input
- I see a success message after registration
- I am redirected to a "pending approval" page
```

### 5.2 Admin Approval

```
As an admin,
I want to see pending registration requests,
So that I can approve or reject new users.

Acceptance Criteria:
- I see a list of pending users with their details
- I can click "Approve" to activate a user
- I can click "Reject" to deny access
- The list updates after my action
```

### 5.3 User Login

```
As an approved user,
I want to log in with my email and password,
So that I can access the platform.

Acceptance Criteria:
- I can enter email and password
- I see an error for invalid credentials
- I am redirected to dashboard on success
- My session persists across page refreshes
```

---

## 6. Out of Scope (v0.4.0)

The following features are NOT included in v0.4.0:

- Password reset / forgot password
- Email verification
- OAuth / SSO (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- User groups / teams
- Fine-grained permissions
- Audit logging
- Session management UI

These may be considered for future releases (v0.5.0+).

---

## 7. Dependencies

| Dependency | Purpose |
|------------|---------|
| `python-jose` | JWT token handling |
| `passlib[bcrypt]` | Password hashing |
| `pydantic` | Request/response validation |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token theft | High | Use short expiration, HTTPS only |
| Brute force attacks | Medium | Rate limiting on login |
| SQL injection | High | Use parameterized queries (SQLAlchemy) |
| XSS attacks | Medium | Sanitize all user input |

---

## 9. Implementation Status

All requirements have been implemented. See `v0.4.0_Auth_RBAC_Implementation_Plan.md` for details.

| Requirement | Status | Notes |
|-------------|--------|-------|
| REQ-001 to REQ-005 | ✅ Complete | Registration with validation |
| REQ-006 to REQ-010 | ✅ Complete | Admin approval workflow |
| REQ-011 to REQ-015 | ✅ Complete | JWT auth, bcrypt hashing |
| REQ-016 to REQ-020 | ✅ Complete | Admin/user roles, protected routes |
| NFR-001 to NFR-005 | ✅ Complete | Security requirements |
| NFR-006 to NFR-010 | ✅ Complete | Password policy |
| NFR-011 to NFR-012 | ✅ Complete | Performance requirements |

---

*Document Version: 2.0*
*Created: Jan 18, 2026*
*Updated: Jan 18, 2026*
*Author: Cascade AI Assistant*
