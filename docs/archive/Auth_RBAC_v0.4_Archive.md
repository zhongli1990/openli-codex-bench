# Authentication & RBAC — Archive (v0.4.x)

> **Status**: ✅ IMPLEMENTED (Jan 18, 2026)

## Revision history

- 2026-01-18: Initial auth + RBAC implementation (JWT, admin/user roles, admin approval flow)
- 2026-02-06: Added RBAC extensions notes for v0.5.0 file access foundations

---

## 1. What this document contains

This archive consolidates the v0.4.0 authentication and RBAC documentation.

For full original documents (kept for reference):

- `v0.4.0_Auth_RBAC_Requirements.md`
- `v0.4.0_Auth_RBAC_Design.md`
- `v0.4.0_Auth_RBAC_Implementation_Plan.md`

---

## 2. Summary

### Implemented capabilities

- User registration (pending by default)
- Admin approval / reject
- Login / logout with JWT
- Two roles: `admin`, `user`
- Protected routes via backend dependencies
- Basic admin endpoints for user management

### v0.5.0 extensions (file access foundations)

- Multi-tenant placeholders (`tenants`)
- Groups and membership (`groups`, `user_groups`)
- Workspace sharing grants (`workspace_access`)
- Workspace ownership (`workspaces.owner_id`)

These were added as schema foundations and are not yet a complete policy enforcement layer.
