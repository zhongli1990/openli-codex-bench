# File Management (Upload & File Browser) — Design

> **Status**: ✅ IMPLEMENTED (Feb 6, 2026)

## Revision history

- 2026-02-06: Initial implementation (upload folder, file browser, download links, RBAC tables)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature 1: Local Folder Upload](#2-feature-1-local-folder-upload)
3. [Feature 2: Workspace File Browser & Download](#3-feature-2-workspace-file-browser--download)
4. [RBAC Model for File Access](#4-rbac-model-for-file-access)
5. [API Specification](#5-api-specification)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Database Schema Changes](#7-database-schema-changes)
8. [Security Considerations](#8-security-considerations)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Executive Summary

This release introduces two major workspace file management capabilities:

1. **Local Folder Upload**: Upload an entire project folder from the browser to create a new workspace.
2. **Workspace File Browser & Download**: Browse, view, upload to, and download files from workspace directories.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Upload size limit | 1GB (folder upload) | Balance usability and server resources |
| File type restrictions | None (upload) | Upload entire folders as-is |
| In-browser view limit | 1MB | Avoid freezing the UI on large files |
| RBAC model | Workspace-level with tenant/groups placeholder | Prepare NHS Trust multi-tenancy |
| UI integration | Agents Tab + Chat UI | Unified experience |

---

## 2. Feature 1: Local Folder Upload

### 2.1 User Flow

1. User clicks **📤 Upload** in the Agents Tab workspace panel.
2. Upload modal opens.
3. User selects a folder (`webkitdirectory`).
4. Browser zips the folder (JSZip).
5. Backend extracts the ZIP to `/workspaces/{workspace_id}/repo/`.
6. Workspace is registered and immediately selectable.

### 2.2 Frontend

- Component: `frontend/src/components/workspace/UploadModal.tsx`
- Dependency: `jszip`

### 2.3 Backend

- Endpoint: `POST /api/workspaces/upload`
- Requires multipart form data (`python-multipart`).

---

## 3. Feature 2: Workspace File Browser & Download

### 3.1 UI Locations

- Agents Tab Output panel: **📁 Files** tab
- Chat UI sidebar: collapsible **📁 Files** panel

### 3.2 Operations

- Browse directories
- View text/code/markdown files in browser (size limited)
- Download single file
- Download folder as ZIP
- Upload a single file to a workspace directory

---

## 4. RBAC Model for File Access

This is a *placeholder foundation* (not full enforcement yet):

- Tenants (orgs)
- Groups and user membership
- Workspace access grants
- Workspace owner tracking

---

## 5. API Specification

- `GET /api/workspaces/{workspace_id}/files?path=/` — list directory
- `GET /api/workspaces/{workspace_id}/files/view?path=/README.md` — view file content
- `GET /api/workspaces/{workspace_id}/files/download?path=/README.md` — download file
- `GET /api/workspaces/{workspace_id}/files/download-zip?path=/output` — download folder as ZIP
- `POST /api/workspaces/{workspace_id}/files/upload` — upload file to workspace
- `POST /api/workspaces/upload` — upload zipped folder as new workspace

---

## 6. Frontend Implementation

- File browser: `frontend/src/components/workspace/FileBrowser.tsx`
- Agents page integration: `frontend/src/app/(app)/codex/page.tsx`
- Chat page integration: `frontend/src/app/(app)/chat/page.tsx`
- Next.js proxy routes under: `frontend/src/app/api/workspaces/**`

---

## 7. Database Schema Changes

Migration: `backend/alembic/versions/003_add_rbac_tables.py`

- New tables: `tenants`, `groups`, `user_groups`, `workspace_access`
- Columns:
  - `users.tenant_id`
  - `workspaces.owner_id`

---

## 8. Security Considerations

- Path traversal protection (all paths constrained under workspace root)
- Upload/view size limits
- Auth required (JWT)

---

## 9. Implementation Checklist

Implemented:

- Backend file endpoints + file service
- Frontend upload modal + file browser + proxy routes
- DB migration for RBAC placeholder tables
- UI feedback indicators for long-running runs
