# RBAC Design — Enterprise SaaS Multi-Tenant Platform

**Version**: v0.7.0  
**Last Updated**: Feb 9, 2026  
**Status**: Implemented (Phase 1)  
**Branch**: `feature/rbac-streaming-v07`

---

## 1. Design Philosophy

**Simple but effective.** A **resource ownership model** where every data record belongs to a tenant, and access is determined by the user's role + tenant membership. No separate permissions table needed — the role IS the permission set.

```
┌──────────────────────────────────────────────────────────────────┐
│                     RESOURCE OWNERSHIP MODEL                      │
│                                                                    │
│   Every resource has:  tenant_id  +  owner_id                     │
│   Every user has:      tenant_id  +  role                         │
│                                                                    │
│   Access = role_privileges ∩ tenant_scope                         │
│                                                                    │
│   tenant_id = NULL  →  Platform-level resource (Super Admin only) │
│   tenant_id = X     →  Org-level resource (visible to tenant X)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. User Hierarchy (3 Tiers, 5 Roles)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: SUPER ADMIN                                 │
│  Platform Owner / System Administrator                                      │
│  Role: super_admin  |  Scope: ALL tenants  |  Privilege: Manage (M)        │
│  - Full platform access across all tenants                                  │
│  - Manage all tenants, users, groups, and system configuration              │
│  - Manage Platform Skills and Hooks                                         │
│  - View audit logs and system metrics                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 2: ORG ADMIN                                   │
│  Customer Organization Administrator                                        │
│  Role: org_admin  |  Scope: Own tenant  |  Privilege: Manage (M)           │
│  - Full access within their tenant/organization                             │
│  - Manage Tenant Skills and Hooks                                           │
│  - Manage users and groups within their organization                        │
│  - Manage workspaces and projects within their organization                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 3: END USERS                                   │
│  Customer Organization Members                                              │
│  Roles: project_admin, editor, viewer  |  Scope: Own tenant                │
│  - project_admin: Create/edit resources, manage own workspaces (W+M own)   │
│  - editor: Create prompts, run agents, use skills (W+R)                    │
│  - viewer: Read-only access to dashboards, prompts, skills (R)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Role Hierarchy

```
super_admin  ⊃  org_admin  ⊃  project_admin  ⊃  editor  ⊃  viewer
  Level 5        Level 4        Level 3          Level 2     Level 1
     M              M            W+M(own)          W+R          R
  (all orgs)    (own org)      (own org)        (own org)   (own org)
```

### 2.2 Privilege Levels

| Privilege | Symbol | Description |
|-----------|--------|-------------|
| **Read**  | `R`    | View/list the resource |
| **Write** | `W`    | Create new, edit own resources |
| **Manage**| `M`    | Edit/delete any resource in scope, assign access |

---

## 3. Database Schema

### 3.1 Core Tables (All Implemented)

```sql
-- Users table (Migration 005: expanded role constraint)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),  -- NULL for Super Admin / unassigned
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    role VARCHAR(20) NOT NULL DEFAULT 'editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_status CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
    CONSTRAINT chk_role CHECK (role IN ('super_admin', 'org_admin', 'project_admin', 'editor', 'viewer'))
);

-- Tenants table (Customer Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB
);

-- Groups table (User Groups within Tenant)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- User-Group Membership
CREATE TABLE user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, group_id)
);

-- Workspace Access Grants (for future fine-grained access)
CREATE TABLE workspace_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    grantee_type VARCHAR(20) NOT NULL,  -- 'user' or 'group'
    grantee_id UUID NOT NULL,
    access_level VARCHAR(20) NOT NULL,  -- 'owner', 'editor', 'viewer'
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(workspace_id, grantee_type, grantee_id)
);
```

### 3.2 Resource Tables (All Have tenant_id + owner_id)

| Resource Table | tenant_id | owner_id | Description |
|----------------|:---------:|:--------:|-------------|
| `workspaces` | ✅ | ✅ | Code repositories / project folders |
| `sessions` | ✅ | — | Agent sessions (inherits from workspace) |
| `runs` | — | — | Individual agent runs (inherits from session) |
| `prompt_templates` | ✅ | ✅ | Prompt templates |
| `skills` | ✅ | ✅ | Agent skills |
| `users` | ✅ | — | User accounts |
| `groups` | ✅ | — | User groups within a tenant |
| `workspace_access` | — | — | Fine-grained workspace grants |

### 3.3 Seeded Sample Data

| Tenant | Groups |
|--------|--------|
| NHS Birmingham Trust (`nhs-birmingham`) | Administrators, Clinical Leads, Developers, Sales |
| Enterprise Corp (`enterprise-corp`) | Administrators, Architecture, Developers, Stakeholders |

---

## 4. Permission Matrix

### 4.1 User & Tenant Management

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/edit tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| View users (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| View users (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/reject users | ✅ | ✅¹ | ❌ | ❌ | ❌ |
| Change user roles | ✅ | ✅² | ❌ | ❌ | ❌ |
| Assign user to tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage groups | ✅ | ✅¹ | ❌ | ❌ | ❌ |

¹ Own tenant only  ² Cannot promote above own role

### 4.2 Prompts & Templates

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit own | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete own | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish | ✅ | ✅ | ✅ | ❌ | ❌ |
| Use/render | ✅ | ✅ | ✅ | ✅ | ❌ |

### 4.3 Skills

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit own | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enable/disable | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.4 Hooks

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Configure (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure (platform) | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.5 Workspaces & Agent Console

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create workspace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete own workspace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run prompts | ✅ | ✅ | ✅ | ✅ | ❌ |
| View sessions/history | ✅ | ✅ | ✅ | ✅ | ✅ |

### 4.6 UI Navigation (Sidebar)

| Page/Tab | super_admin | org_admin | project_admin | editor | viewer |
|----------|:-----------:|:---------:|:-------------:|:------:|:------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agent Console | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Chat | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Prompts | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin → Users | ✅ | ✅¹ | ❌ | ❌ | ❌ |
| Admin → Skills | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin → Hooks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings & RBAC modal | ✅ | ✅ | ❌ | ❌ | ❌ |

👁️ = Read-only view  ¹ = Filtered to own tenant

---

## 5. Backend Implementation

### 5.1 Core RBAC Module (`backend/app/auth/rbac.py`)

```python
ROLE_HIERARCHY = {
    "super_admin": 5,
    "admin": 5,        # legacy alias
    "org_admin": 4,
    "project_admin": 3,
    "editor": 2,
    "viewer": 1,
}

def is_super_admin(user) -> bool:
    return user.role in ("admin", "super_admin")

def has_min_role(user, min_role: str) -> bool:
    return ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)

def tenant_filter(query, model, user):
    """THE core RBAC pattern — apply tenant scoping to any SQLAlchemy query.
    - super_admin: no filter (sees everything)
    - others: resource.tenant_id = user.tenant_id OR resource.tenant_id IS NULL
    """
    if is_super_admin(user):
        return query
    return query.where(or_(
        model.tenant_id == user.tenant_id,
        model.tenant_id.is_(None),
    ))

def require_role(min_role: str):
    """FastAPI dependency factory: require at least min_role level."""
    async def _dep(user = Depends(get_current_user)):
        if not has_min_role(user, min_role):
            raise HTTPException(403, f"Requires {min_role} role or higher")
        return user
    return _dep
```

### 5.2 Resource Creation Auto-Tags Tenant

```python
# All workspace/session/template creation auto-inherits tenant_id:
workspace = await repo.create(
    ...,
    tenant_id=user.tenant_id if user else None,
)
```

### 5.3 Admin Users Scoping

```python
# Org admins only see users in their own tenant
if not is_super_admin(admin) and admin.tenant_id:
    query = query.where(User.tenant_id == admin.tenant_id)
```

### 5.4 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/users` | GET | org_admin+ | List users (scoped by tenant) |
| `/api/admin/users/{id}/role` | POST | org_admin+ | Change user role |
| `/api/admin/users/{id}/tenant` | POST | super_admin | Assign user to tenant |
| `/api/admin/tenants` | GET | org_admin+ | List tenants |
| `/api/admin/groups` | GET | org_admin+ | List groups |
| `/api/admin/rbac/summary` | GET | org_admin+ | RBAC statistics |
| `/api/workspaces` | GET | any | List workspaces (tenant-filtered) |

### 5.5 JWT Claims

```python
# Login response includes tenant_id in JWT:
payload = {
    "sub": str(user.id),
    "email": user.email,
    "role": user.role,
    "tenant_id": str(user.tenant_id) if user.tenant_id else None,
}
```

---

## 6. Frontend Implementation

### 6.1 Role Helpers (`lib/auth.ts`)

```typescript
const ROLE_LEVELS = { super_admin: 5, admin: 5, org_admin: 4, project_admin: 3, editor: 2, viewer: 1 };

export function hasMinRole(userRole: string | null, minRole: string): boolean {
  if (!userRole) return false;
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[minRole] || 0);
}

export function isSuperAdmin(role: string | null): boolean {
  return role === "super_admin" || role === "admin";
}

export function isAdminRole(role: string | null): boolean {
  return !!role && ["admin", "super_admin", "org_admin"].includes(role);
}
```

### 6.2 AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasMinRole: (minRole: string) => boolean;
  // ...
}
```

### 6.3 Sidebar Navigation (Role-Gated)

```typescript
const adminItems = [
  { href: "/admin/users", label: "User Management", minRole: "org_admin" },
  { href: "/admin/skills", label: "Skills",          minRole: "project_admin" },
  { href: "/admin/hooks", label: "Hooks",            minRole: "org_admin" },
];

const visibleAdminItems = adminItems.filter(i => hasMinRole(user?.role, i.minRole));
```

### 6.4 AuthGuard (Route Protection)

```typescript
// /admin/* routes require isAdminRole (super_admin, org_admin)
if (pathname.startsWith("/admin") && !isAdminRole(user.role)) {
  router.replace("/dashboard");
}
```

---

## 7. Resource Visibility Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESOURCE VISIBILITY RULES                      │
│                                                                    │
│  Super Admin:                                                      │
│    → Sees ALL resources across ALL tenants                        │
│    → Can CRUD any resource                                        │
│                                                                    │
│  Org Admin / Project Admin / Editor / Viewer:                     │
│    → Sees resources WHERE:                                        │
│        resource.tenant_id = user.tenant_id   (own org)            │
│        OR resource.tenant_id IS NULL         (platform/shared)    │
│    → Write/Manage based on role level                             │
│                                                                    │
│  No tenant_id on user (unassigned):                               │
│    → Can only see platform-level resources (tenant_id IS NULL)    │
│    → Effectively read-only until assigned to a tenant             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Status

### Phase 1: ✅ Implemented (v0.7.0)

- [x] Migration 005: Expand User.role to 5 roles
- [x] Auto-migrate legacy roles (admin→super_admin, user→editor)
- [x] Seed sample tenants and groups on startup
- [x] `rbac.py`: `tenant_filter()`, `has_min_role()`, `require_role()`
- [x] `tenant_id` in JWT claims
- [x] Workspace list: tenant-scoped filtering
- [x] Workspace/session create: auto-tag `tenant_id`
- [x] Admin users: org_admin sees own tenant only
- [x] prompt-manager: `is_admin` updated for new roles
- [x] Frontend: `hasMinRole()`, `isSuperAdmin()` helpers
- [x] Frontend: AuthContext exposes role checks
- [x] Frontend: Sidebar admin items filtered by role level
- [x] Frontend: Admin Users page — role dropdown, tenant dropdown (super_admin only)
- [x] Frontend: Settings & RBAC modal fetches live DB data
- [x] Frontend: AuthGuard updated for new role hierarchy

### Phase 2: Planned (Future)

- [ ] Workspace-level access grants via `workspace_access` table
- [ ] Group-based permissions via `user_groups` membership
- [ ] Audit logging for RBAC-sensitive operations
- [ ] Fine-grained permission overrides per resource
- [ ] Tenant management UI (create/edit/delete tenants)
- [ ] Group management UI (assign users to groups)

---

## 9. Test Scenarios

### 9.1 Super Admin Tests

| Test | Expected Result |
|------|-----------------|
| Login as Super Admin | Full navigation visible (all admin tabs) |
| View all tenants | All tenants listed |
| View all users | All users across all tenants |
| Change any user's role | Success |
| Assign user to tenant | Success |
| View all workspaces | All workspaces across all tenants |
| Create platform skill | Success |

### 9.2 Org Admin Tests

| Test | Expected Result |
|------|-----------------|
| Login as Org Admin | Admin tabs: Users, Skills, Hooks visible |
| View users | Only own tenant's users |
| Change user role (within tenant) | Success (cannot promote above own role) |
| Assign user to tenant | 403 Forbidden (super_admin only) |
| View workspaces | Own tenant + platform workspaces |
| Create tenant skill | Success |
| Configure platform hooks | 403 Forbidden |

### 9.3 Editor / Viewer Tests

| Test | Expected Result |
|------|-----------------|
| Login as Editor | No admin tabs in sidebar |
| Access /admin/users | Redirected to /dashboard |
| View workspaces | Own tenant + platform workspaces |
| Create workspace | Success (editor), Forbidden (viewer) |
| Run prompts | Success (editor), Forbidden (viewer) |

---

## 10. Security Considerations

### 10.1 Defense in Depth

1. **Frontend**: Hide unauthorized UI elements via `hasMinRole()`
2. **API**: Validate permissions on every request via `require_role()` / `tenant_filter()`
3. **Database**: Row-level scoping via `tenant_id` on all resource tables

### 10.2 Session Security

- JWT tokens include `role` and `tenant_id` claims
- Role changes require logout/login to take effect (new JWT)
- `require_admin` / `require_super_admin` dependencies on all admin endpoints

### 10.3 Migration Path

For existing users without tenant assignment:
1. Legacy `admin` role auto-migrated to `super_admin`
2. Legacy `user` role auto-migrated to `editor`
3. Users without `tenant_id` see only platform-level resources
4. Super admin assigns users to tenants via Admin → Users page

---

## Appendix A: Default Groups per Tenant

| Group | Description | Seeded For |
|-------|-------------|------------|
| Administrators | Org Admins | Both tenants |
| Clinical Leads | Domain experts | NHS Birmingham Trust |
| Developers | Development team | Both tenants |
| Sales | Sales team | NHS Birmingham Trust |
| Architecture | Solution architects | Enterprise Corp |
| Stakeholders | Business stakeholders | Enterprise Corp |

---

## Appendix B: File Locations

| Component | File |
|-----------|------|
| RBAC module | `backend/app/auth/rbac.py` |
| Auth dependencies | `backend/app/auth/dependencies.py` |
| Admin router | `backend/app/admin/router.py` |
| Migration 005 | `backend/alembic/versions/005_expand_rbac_roles.py` |
| Frontend role helpers | `frontend/src/lib/auth.ts` |
| AuthContext | `frontend/src/contexts/AuthContext.tsx` |
| AuthGuard | `frontend/src/components/AuthGuard.tsx` |
| Sidebar | `frontend/src/components/Sidebar.tsx` |
| Admin Users page | `frontend/src/app/(app)/admin/users/page.tsx` |
| Settings & RBAC modal | `frontend/src/components/SettingsMenu.tsx` |
| prompt-manager auth | `prompt-manager/app/auth.py` |
