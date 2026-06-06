# File Management (Upload & File Browser) — Requirements

> **Status**: ✅ IMPLEMENTED (Feb 6, 2026)

## Revision history

- 2026-02-06: Initial implementation (upload folder, file browser, download links, RBAC tables)

---

## 1. Overview

This document defines the requirements for:

- Uploading a local folder from the browser to create a new workspace
- Browsing and downloading workspace files (including ZIP folder download)
- Uploading additional files to an existing workspace
- RBAC placeholders for multi-tenant access control

---

## 2. Baseline

Already implemented in the platform:

- Workspace import from GitHub URL
- Server-side local folder scan/import
- Auth (JWT)
- Agents Tab and Chat UI

---

## 3. Functional Requirements

### FR-1: Local Folder Upload (Create Workspace)

Users can upload entire project folders from their local machine (browser) to create new workspaces.

Acceptance criteria:

- 📤 Upload button visible in Agents Tab workspace panel
- Folder selection via `webkitdirectory` input
- Browser-side ZIP compression before upload
- Upload progress indicator
- Maximum upload size: 1GB
- All file types accepted (no restrictions)
- Workspace created with `source_type="upload"`

### FR-2: Workspace File Browser

Users can browse files and directories within a workspace.

Acceptance criteria:

- 📁 Files tab in Agents Tab Output panel
- 📁 Files panel in Chat UI sidebar
- Directory navigation
- Clear distinction between files and directories

### FR-3: File View

Users can view text-based file contents in the browser.

Acceptance criteria:

- View action available for supported text/code extensions
- Maximum viewable size: 1MB

### FR-4: File Download

Users can download individual files or entire folders.

Acceptance criteria:

- Download single file
- Download folder as ZIP

### FR-5: Upload File to Workspace

Users can upload additional files to an existing workspace directory.

Acceptance criteria:

- Upload action in FileBrowser
- File appears after upload

### FR-6: RBAC Placeholders

File operations are designed to respect workspace access permissions.

Acceptance criteria:

- RBAC tables exist for tenants/groups/workspace grants
- Workspace ownership (`owner_id`) is present

---

## 4. Non-Functional Requirements

- **Security**: path traversal prevention, auth required
- **Performance**: directory listing should be usable for typical project trees
- **Reliability**: retries for download; uploads should fail cleanly
