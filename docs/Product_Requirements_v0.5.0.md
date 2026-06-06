# Product Requirements — v0.5.0 (Upload & File Browser)

> **Status**: 🔜 PLANNED
> **Target Release**: v0.5.0
> **Created**: Feb 6, 2026
> **Related Documents**:
> - `v0.5.0_Upload_FileBrowser_Design.md` - Technical design specification
> - `v0.4.0_Auth_RBAC_Design.md` - Authentication foundation

---

## 1. Release Overview

v0.5.0 extends the workspace management capabilities with two major features:

1. **Local Folder Upload**: Upload entire project folders from the browser to create new workspaces
2. **Workspace File Browser & Download**: Browse, view, upload to, and download files from workspace directories

This release also introduces the foundation for **multi-tenant RBAC** to support NHS Trust organizations with proper data isolation and access control.

---

## 2. Current Baseline (v0.4.x)

| Feature | Status |
|---------|--------|
| GitHub URL import | ✅ Implemented |
| Server-side folder scan | ✅ Implemented |
| User authentication | ✅ Implemented |
| Admin/user roles | ✅ Implemented |
| Agents Tab workflow | ✅ Implemented |
| Chat UI | ✅ Implemented |
| **Local folder upload from browser** | ❌ Not implemented |
| **Workspace file browsing** | ❌ Not implemented |
| **File download** | ❌ Not implemented |
| **Multi-tenant RBAC** | ❌ Not implemented |

---

## 3. Goals

1. Enable users to upload project folders directly from their browser
2. Provide visibility into workspace contents (files generated/revised by AI agents)
3. Allow download of individual files or entire folders
4. Establish multi-tenant RBAC foundation for NHS Trust deployment
5. Unified file access experience across Agents Tab and Chat UI

---

## 4. Non-Goals (Out of Scope for v0.5.0)

- Real-time file change notifications (WebSocket)
- File editing in browser
- Version control / file history
- External storage integration (S3, Azure Blob)
- Fine-grained per-file permissions

---

## 5. Personas

| Persona | Needs |
|---------|-------|
| **Integration Engineer** | Upload local projects, download AI-generated analysis reports |
| **Solution Architect** | Browse workspace artifacts, download design documents |
| **Clinical Informaticist** | Access generated specifications, download for review |
| **Compliance Officer** | Download audit artifacts, verify generated content |

---

## 6. Functional Requirements

### FR-1: Local Folder Upload

Users can upload entire project folders from their local machine (browser) to create new workspaces.

**Acceptance Criteria**:
- [ ] "📤 Upload" button visible in Agents Tab workspace panel
- [ ] Upload modal with drag-and-drop zone
- [ ] Folder selection via `webkitdirectory` input
- [ ] Browser-side ZIP compression before upload
- [ ] Upload progress indicator
- [ ] Maximum upload size: 1GB
- [ ] All file types accepted (no restrictions)
- [ ] Workspace created with `source_type="upload"`
- [ ] Workspace immediately available in dropdown after upload

### FR-2: Workspace File Browser

Users can browse files and directories within a workspace.

**Acceptance Criteria**:
- [ ] "📁 Files" tab in Agents Tab Output panel
- [ ] "📁 Files" panel in Chat UI sidebar
- [ ] Directory navigation (click to enter, breadcrumb to go up)
- [ ] File listing with name, size, modified date
- [ ] Visual distinction between files and directories
- [ ] Empty state for empty directories

### FR-3: File View

Users can view text-based file contents in the browser.

**Acceptance Criteria**:
- [ ] "View" button for text-based files
- [ ] File viewer modal with syntax highlighting
- [ ] Support for: .md, .txt, .json, .yaml, .py, .js, .ts, .html, .css, .sql
- [ ] Copy to clipboard functionality
- [ ] Maximum viewable file size: 1MB

### FR-4: File Download

Users can download individual files or entire folders.

**Acceptance Criteria**:
- [ ] "⬇ Download" button for individual files
- [ ] "⬇ Download All as ZIP" button for folders
- [ ] Proper Content-Disposition headers for file names
- [ ] No file size limit for downloads

### FR-5: File Upload to Workspace

Users can upload additional files to an existing workspace.

**Acceptance Criteria**:
- [ ] "⬆ Upload" button in file browser
- [ ] Single file upload (not folder)
- [ ] Target directory selection
- [ ] File appears in listing after upload

### FR-6: RBAC for File Access

File operations respect workspace access permissions.

**Acceptance Criteria**:
- [ ] Workspace owner has full access
- [ ] Tenant users have default download access
- [ ] Users from different tenants cannot access workspace
- [ ] Unauthenticated users cannot access files
- [ ] Admin users have full access to all tenant workspaces

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|--------|--------|
| File listing response | < 500ms for directories with < 1000 files |
| File download start | < 1s for files < 10MB |
| Upload throughput | Limited by network, not server |

### 7.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Path traversal prevention | Validate all paths under workspace root |
| Tenant isolation | All operations check tenant_id |
| Authentication required | All file endpoints require valid JWT |
| Size limits | 1GB upload, 100MB single file, 1MB view |

### 7.3 Reliability

- File operations are atomic (no partial states)
- Failed uploads do not create orphan workspaces
- Download failures can be retried

---

## 8. API Specification

### 8.1 New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspaces/upload` | POST | Upload ZIP as new workspace |
| `/api/workspaces/{id}/files` | GET | List files at path |
| `/api/workspaces/{id}/files/view` | GET | View file content |
| `/api/workspaces/{id}/files/download` | GET | Download single file |
| `/api/workspaces/{id}/files/download-zip` | GET | Download folder as ZIP |
| `/api/workspaces/{id}/files/upload` | POST | Upload file to workspace |

### 8.2 New Database Tables

| Table | Purpose |
|-------|---------|
| `tenants` | NHS Trust organizations |
| `groups` | User groups within tenant |
| `user_groups` | User-group membership |
| `workspace_access` | Workspace sharing grants |

---

## 9. UI Specification

### 9.1 Agents Tab Changes

```
┌─────────────────────────────────────────────────────────────────┐
│ Workspace                                                        │
│ [+ Import]  [🔍 Scan]  [📤 Upload]  [🗑️ Remove]                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Select a workspace...                                    ▼  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Output                                                           │
│ [Transcript] [Raw Events] [📁 Files]  ← NEW TAB                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Path: /output                              [⬆] [⬆ Upload]   │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ 📁 reports/                                        [Browse] │ │
│ │ 📄 analysis.md              15 KB    [View] [⬇ Download]    │ │
│ │ 📄 spec.json                 8 KB    [View] [⬇ Download]    │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ [⬇ Download All as ZIP]                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Chat UI Changes

```
┌───────────────┐
│ Workspace     │
│ Sessions      │
│ ─────────────│
│ 📁 Files      │  ← NEW PANEL
│ Path: /       │
│ ┌───────────┐│
│ │📁 src/    ││
│ │📁 output/ ││
│ │📄 README  ││
│ └───────────┘│
│ [⬆ Upload]   │
│ [⬇ Download] │
└───────────────┘
```

---

## 10. Delivery Plan

### Phase 1: Backend API (Priority: High)
1. Add RBAC database tables
2. Implement file listing endpoint
3. Implement file download endpoint
4. Implement folder ZIP download endpoint
5. Implement workspace upload endpoint
6. Implement file upload endpoint
7. Add RBAC permission checks

### Phase 2: Frontend - Agents Tab (Priority: High)
1. Add Upload button and modal
2. Add Files tab to Output panel
3. Implement FileBrowser component
4. Implement FileViewer modal
5. Add download functionality

### Phase 3: Frontend - Chat UI (Priority: High)
1. Add Files panel to sidebar
2. Integrate FileBrowser component
3. Add upload/download buttons

### Phase 4: Testing & Documentation (Priority: Medium)
1. Unit tests for file operations
2. Integration tests for upload/download
3. E2E tests for full workflow
4. Update user documentation

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Upload success rate | > 99% |
| Download success rate | > 99.9% |
| User adoption (uploads/week) | Track baseline |
| File browser usage | Track page views |

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large file uploads timeout | Chunked upload, progress indicator |
| Path traversal attacks | Strict path validation |
| Storage exhaustion | Workspace retention policies (future) |
| Performance with large directories | Pagination, lazy loading |

---

## 13. Dependencies

| Dependency | Status |
|------------|--------|
| v0.4.0 Authentication | ✅ Complete |
| PostgreSQL database | ✅ Available |
| JSZip library (frontend) | 🔜 To be added |
| python-multipart (backend) | 🔜 To be added |

---

*Document Version: 1.0*
*Created: Feb 6, 2026*
*Author: Cascade AI Assistant*
