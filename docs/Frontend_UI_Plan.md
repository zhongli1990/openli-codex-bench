# Frontend UI Development Plan (SaaS Dashboard)

## Goals
Build a production-oriented SaaS UI for the Codex-driven coding workflow.

The UI should support:

- Authentication and tenant context (Org/Team) as first-class concepts
- A dashboard shell (sidebar + top bar) with consistent navigation
- Project and session management
- A streaming “run” experience (events, tool output, diffs)
- Settings placeholders for integrations (Git providers), billing, and security

## Research summary (open-source references)
The following open-source references are good fits for a Next.js App Router SaaS UI.

- shadcn/ui Dashboard Example
  - https://ui.shadcn.com/examples/dashboard
  - Strong baseline layout patterns and information hierarchy

- next-shadcn-dashboard-starter (Kiranism)
  - https://github.com/Kiranism/next-shadcn-dashboard-starter
  - Useful for folder structure, dashboard navigation patterns

- SaaS-Boilerplate (ixartz)
  - https://github.com/ixartz/SaaS-Boilerplate
  - Broad “SaaS completeness” checklist (auth, teams, roles), good for roadmap

- next-saas-stripe-starter (mickasmt)
  - https://github.com/mickasmt/next-saas-stripe-starter
  - Good reference for role-based admin vs user dashboards and billing integration patterns

- nextjs/saas-starter
  - https://github.com/nextjs/saas-starter
  - Reference for how Next.js expects typical SaaS scaffolding (auth, dashboard, billing)

## Chosen approach for this repo
We will uplift the current frontend with:

- TailwindCSS for consistent styling and layout
- A SaaS “App Shell” (sidebar + top navigation)
- Route groups for app vs auth pages
- Placeholder pages wired to backend endpoints where possible

If/when you want the full shadcn/ui component set, we will add it after Phase 1 so the foundation (routing + information architecture) is stable.

## Information architecture (routes)

- /(auth)
  - /login

- /(app)
  - /dashboard
  - /projects
  - /codex (existing workflow, uplifted)
  - /settings

## UI feature roadmap

## v0.2.0 planned uplift

Planned scope for the next release is documented in:
- `archive/Product_Requirements_v0.2.0_Archive.md`
- `archive/v0.2.0_Implementation_Plan_Archive.md`

v0.2.0 UI uplift focuses on making the existing `/codex` page usable as a multi-workspace, multi-runner console.

### v0.2.0 — Workspace import and registry

- Add workspace source input(s):
  - GitHub URL (clone)
  - Local workspace path (server-side accessible)
- Add a workspace dropdown listing imported workspaces.
- Display sensible workspace names derived from source metadata.

### v0.2.0 — Runner selection

- Add a runner dropdown:
  - Codex
  - Claude

Runner selection is applied at **session creation time** and is fixed per session.

### v0.2.0 — Transcript UX

- Replace the current raw JSON textarea as the primary UX.
- Provide:
  - a readable transcript view (Markdown)
  - a raw events view (lossless JSON/event stream) for debugging/audit

### v0.2.0 — Session selection and continuation

- After selecting a workspace, show a sessions list for that workspace.
- Support:
  - create new session (choose runner)
  - continue existing session

### Phase 1 — SaaS shell + navigation + placeholders (start now)
Deliver a UI that looks and behaves like a SaaS dashboard, while keeping existing functionality.

- App shell
  - Sidebar navigation
  - Top nav with tenant placeholder + user menu placeholder
  - Responsive layout (desktop first, mobile later)

- Pages
  - Dashboard page (placeholder KPIs)
  - Projects page (placeholder list; later becomes real)
  - Settings page (placeholders for integrations and billing)
  - Codex page (existing flow, improved layout + streaming view)
  - Login page placeholder

Acceptance criteria:

- Navigating between pages preserves the app shell
- The Codex page remains functional
- Basic visual consistency (spacing, typography, hierarchy)

### Phase 2 — Auth + tenant context (backend coordination)
- Auth integration strategy (Auth.js, OIDC, or FastAPI JWT)
- Org/team selector and tenant-scoped navigation
- Persist “current project” and “current session” in the UI

Acceptance criteria:

- You can log in, select a tenant, and see tenant-scoped resources

### Phase 3 — Project/session management UX
- Projects list + create project (repo URL, metadata)
- Sessions history (per project)
- Run history and run replay

Acceptance criteria:

- You can browse past sessions and re-open a past run transcript

### Phase 4 — Streaming run experience (enterprise UX)
- Message transcript view
- Tool calls panel
- File changes/diff viewer
- Search and filtering

Acceptance criteria:

- A run feels like an IDE-integrated agent: clear tool boundaries and actionable diffs

### Phase 5 — SaaS operational UX
- Billing placeholders (Stripe)
- Admin console placeholder
- Audit log views
- Workspace retention policies UI

## Implementation notes

- Keep API calls routed through Next.js `/api/*` routes so the browser never needs to know internal service names.
- Prefer small, composable components under `src/components`.
- Avoid prematurely adding complex state management until the core pages and navigation stabilize.
- Local development note: the IDE will show `Cannot find module` / missing type errors for Next/React/Node until you install Node dependencies in `frontend/` and `runner/`.

## Progress log

### 2026-02-06 (v0.5.1 Complete)

- Created `File_Management_Design.md` with full technical specification
- Created `File_Management_Requirements.md` with feature requirements
- Updated `Status_and_Roadmap.md` with current features
- Updated `archive/Auth_RBAC_v0.4_Archive.md` with RBAC extensions

**v0.5.0 UI Changes Implemented:**

- **Agents Tab - Workspace Panel**:
  - ✅ Added "📤 Upload" button next to Import/Scan/Remove
  - ✅ Upload modal with drag-and-drop folder selection
  - ✅ Browser-side ZIP compression (JSZip)
  - ✅ Upload progress indicator

- **Agents Tab - Output Panel**:
  - ✅ Added "📁 Files" tab alongside Transcript/Raw Events
  - ✅ FileBrowser component with directory navigation
  - ✅ FileViewer modal for text-based files
  - ✅ Download buttons (single file, ZIP folder)
  - ✅ Upload button for adding files to workspace

- **Chat UI - Sidebar**:
  - ✅ Added collapsible "📁 Files" panel below Sessions
  - ✅ Compact FileBrowser component

- **New Components Created**:
  - ✅ `components/workspace/UploadModal.tsx`
  - ✅ `components/workspace/FileBrowser.tsx`
  - ✅ `components/workspace/index.ts`

### 2026-01-19 (v0.4.x)

- Implemented user authentication and RBAC (v0.4.0)
- Simplified Agents workflow with always-enabled runner dropdown (v0.4.1)
- Added Remove Workspace button with confirmation (v0.4.1)
- Added Codex skip git trust check for manually copied folders (v0.4.2)

### 2026-01-18 (v0.2.x - v0.3.0)

- Enterprise Chat UI with message persistence (v0.2.4)
- State persistence across tab switches (v0.2.5)
- Click-to-load run history (v0.2.6)
- Dashboard, Projects, Settings UI tab uplift (v0.3.0)

### 2026-01-15

- Added TailwindCSS + PostCSS configuration and global styles.
- Implemented a Phase 1 SaaS-style app shell (sidebar + top nav) and placeholder pages.
- Moved the Codex workflow into `/codex` under the new app shell.
- Implemented Next.js API routes under `/api/*` to proxy to the backend so the browser does not need to call internal service URLs.
- Wired the Codex page UI to the backend session/run/event endpoints via `/api/sessions`, `/api/sessions/[sessionId]/prompt`, and `/api/runs/[runId]/events`.
- Implemented `/` -> `/dashboard` redirect via `next.config.mjs` redirects.
- Added basic sidebar active-route highlighting (client-side) without relying on `next/navigation`.
- Resolved a Next.js route-group conflict by ensuring only one page resolves to each path (for example `/codex` lives under the `(app)` route group).
- Added `Dev_Environment.md` to pin Node.js 20 LTS and document Windows/AWS Ubuntu 24.04 setup.
- Installed Node.js locally on Windows and installed `runner/` + `frontend/` npm dependencies (using `npm.cmd` to bypass PowerShell `npm.ps1` execution policy restrictions).
