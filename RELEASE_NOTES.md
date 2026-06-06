# Release Notes

## v0.4.3 (Jun 1, 2026)

### Credential rotation + standing superadmin + username login

Portfolio-wide IP-protection / credential pass.

#### Changed
- **Default admin password** rotated from `Admin123!` to `Windsor_789+` (`ADMIN_PASSWORD` default in `create_initial_admin`).
- **Login accepts a username**: `LoginRequest.email` relaxed from `EmailStr` to `str` (registration still requires a valid email); login form field is now "Email or username" (`type="text"`).

#### Added
- **Standing `superadmin` account**: `ensure_superadmin()` runs on every startup (lifespan) and idempotently creates a `super_admin` whose login id is the bare word `superadmin` (password default `Windsor_789+`, override via `SUPERADMIN_PASSWORD`).

#### Files Changed
- `backend/app/auth/schemas.py` - LoginRequest.email EmailStr -> str
- `backend/app/main.py` - default admin password Windsor_789+; ensure_superadmin() + lifespan call
- `frontend/src/app/(auth)/login/page.tsx` - login input type=text, "Email or username"

---

## v0.4.2 (Jan 19, 2026)

### Agents Reliability + UX Polish

This patch release improves reliability when running Codex prompts on manually copied local folders, and includes minor Agents UI polish.

#### Reliability Fix
- **Codex Git Trust Check Disabled**: Backend now creates Codex threads with `skipGitRepoCheck=true` so prompts can run in manually copied folders that are not trusted git repositories.

#### UX Polish
- **Workspace Button Order**: Workspace panel header buttons are now ordered **Import → Scan → Remove**.

#### Files Changed
- `backend/app/main.py` - Set `skipGitRepoCheck` true when creating/recreating threads
- `frontend/src/app/(app)/codex/page.tsx` - Reorder workspace panel buttons
- `docs/v0.2.0_Status_and_Roadmap.md` - Update commit history

---

## v0.4.1 (Jan 19, 2026)

### Agents Page Workflow Improvements

This patch release simplifies the Agents page workflow for better UX when managing workspaces, sessions, and runners.

#### Simplified Workflow
- **Runner Always Enabled**: Runner dropdown is now always selectable, not locked when session exists
- **Auto-Clear on Runner Change**: Changing runner automatically clears the current session
- **Create Session Always Visible**: Button always visible when workspace selected
- **Clear Session Button**: New button to explicitly clear session without changing runner

#### Remove Workspace Feature
- **Delete Button**: New 🗑️ Remove button in workspace panel
- **Confirmation Dialog**: Prevents accidental deletion with modal confirmation
- **Cascade Delete**: Removes workspace and all associated sessions/runs

#### New API Endpoint
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspaces/{id}` | DELETE | Delete workspace and all sessions/runs |

#### Files Changed
- `frontend/src/app/(app)/codex/page.tsx` - Simplified workflow, delete confirmation
- `backend/app/main.py` - DELETE workspace endpoint
- `backend/app/repositories/workspace_repo.py` - delete() method
- `frontend/src/app/api/workspaces/[workspaceId]/route.ts` - DELETE proxy

#### Design Document
- `docs/v0.4.1_Agents_Workflow_Design.md` - Full lifecycle design specification

---

## v0.4.0 (Jan 18, 2026)

### User Authentication & Role-Based Access Control (RBAC)

This major release implements a complete user authentication system with admin approval workflow and role-based access control, as documented in the v0.4.0 Auth & RBAC specifications.

#### Authentication System
- **JWT Authentication**: Secure token-based authentication with 24-hour expiration
- **Password Security**: bcrypt hashing with 12 rounds, password validation rules
- **Login/Register**: Full authentication flow with email/password
- **Session Management**: Token stored in localStorage, auto-logout on expiry

#### User Registration Workflow
- **Self-Registration**: Users can register with email, password, optional display name and mobile
- **Pending Approval**: New registrations default to "pending" status
- **Admin Approval**: Admins can approve, reject, activate, or deactivate users
- **Status Flow**: pending → active/rejected, active ↔ inactive

#### Role-Based Access Control
- **User Roles**: `admin` and `user` roles
- **Admin Privileges**: User management, approval workflow
- **Protected Routes**: Admin endpoints require admin role
- **Initial Admin**: Auto-created on startup (admin@saas-codex.com / Admin123!)

#### Backend Implementation
- **User Model**: New `users` table with id, email, mobile, password_hash, display_name, status, role, timestamps
- **Auth Module** (`backend/app/auth/`):
  - `security.py` - JWT creation/validation, bcrypt password hashing
  - `schemas.py` - Pydantic models for auth requests/responses
  - `dependencies.py` - FastAPI dependencies (get_current_user, require_admin)
  - `router.py` - Auth endpoints (login, register, me, logout)
- **Admin Module** (`backend/app/admin/`):
  - `router.py` - User management endpoints (list, approve, reject, activate, deactivate)
- **Migration**: `002_add_users_table.py` - Alembic migration for users table

#### Frontend Implementation
- **Auth Library** (`frontend/src/lib/auth.ts`):
  - Login, register, logout, getMe functions
  - Token management (localStorage)
- **Auth Context** (`frontend/src/contexts/AuthContext.tsx`):
  - Global auth state management
  - isAuthenticated, isAdmin, user state
- **Auth Pages** (`frontend/src/app/(auth)/`):
  - `/login` - Login form with error handling
  - `/register` - Registration form with password validation
  - `/pending` - Pending approval status page
- **Admin Panel** (`frontend/src/app/(app)/admin/users/`):
  - User list with status filter
  - Approve/Reject/Activate/Deactivate actions
  - Pending count badge
- **Sidebar Updates**:
  - Admin section with User Management link (admin only)
  - User info display with email and logout button

#### New API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (pending status) |
| `/api/auth/login` | POST | Login, returns JWT token |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/logout` | POST | Logout (client-side) |
| `/api/admin/users` | GET | List all users (admin only) |
| `/api/admin/users/pending` | GET | List pending users (admin only) |
| `/api/admin/users/{id}` | GET | Get user by ID (admin only) |
| `/api/admin/users/{id}/approve` | POST | Approve pending user (admin only) |
| `/api/admin/users/{id}/reject` | POST | Reject pending user (admin only) |
| `/api/admin/users/{id}/activate` | POST | Activate user (admin only) |
| `/api/admin/users/{id}/deactivate` | POST | Deactivate user (admin only) |

#### New Dependencies
- `bcrypt==4.0.1` - Password hashing
- `python-jose[cryptography]==3.3.0` - JWT tokens
- `pydantic[email]==2.10.3` - Email validation

#### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET_KEY` | dev-secret-key-... | Secret key for JWT signing |
| `JWT_EXPIRE_MINUTES` | 1440 (24h) | Token expiration time |
| `ADMIN_EMAIL` | admin@saas-codex.com | Initial admin email |
| `ADMIN_PASSWORD` | Admin123! | Initial admin password |

#### Release Info
- **Tag**: `v0.4.0`
- **Branch**: Merged `user-management` → `main`
- **Commit**: `41e7725`
- **Date**: Jan 18, 2026

---

## v0.3.0 (Jan 18, 2026)

### Enterprise UI Tab Uplift + Dark Mode + Agents Rename

This major release transforms the Dashboard, Projects, and Settings tabs from placeholders into fully functional, enterprise-grade interfaces with real data and professional UX.

#### Dashboard Tab
- **Real Metrics**: Live counts for Workspaces, Sessions, Runs Today, and Total Runs from database
- **Activity Feed**: Recent runs with status indicators, workspace names, runner types, and timestamps
- **Quick Actions**: One-click navigation to Import Project, Start Chat, Run Codex, View Projects
- **System Status**: Real-time health checks for Backend, Codex Runner, Claude Runner, and Database
- **Auto-refresh**: Dashboard data automatically refreshes every 30 seconds
- **Loading States**: Skeleton loaders provide visual feedback during data fetch

#### Projects Tab
- **Workspace Cards**: Rich cards showing display name, source URL/path, session/run counts, creation date
- **Search & Filter**: Instantly filter workspaces by name or source URI
- **Actions Menu**: Refresh and Copy Path options via dropdown menu
- **Session Expansion**: Click to expand and view all sessions within a workspace
- **Quick Navigation**: "Open in Codex" and "Open in Chat" buttons on each workspace card
- **Empty State**: Helpful guidance when no workspaces exist

#### Settings Tab
- **Sidebar Navigation**: Clean category navigation (General, Runners, Appearance, About)
- **General Settings**: Default runner selection, session timeout configuration, auto-save toggle
- **Runner Configuration**: Accurate model lists with current SDK/API versions
- **Appearance Settings**: Theme (light/dark/system) with immediate application, compact mode, code font, syntax theme
- **About Page**: Version info, build hash, license, and resource links
- **localStorage Persistence**: All settings saved to browser localStorage and persist across sessions
- **Save Confirmation**: Visual "✓ Saved" feedback when settings are saved

#### Settings Tab - Model Configuration (Updated)
- **Codex Runner**: Uses `@openai/codex-sdk` v0.84.0 (agentic coding SDK)
- **Claude Models** (accurate current list):
  - Claude Sonnet 4 (2025-05-14) - Latest, default
  - Claude 3.5 Sonnet (2024-10-22)
  - Claude 3.5 Haiku (2024-10-22)
  - Claude 3 Opus (2024-02-29)
  - Claude 3 Sonnet (2024-02-29)
  - Claude 3 Haiku (2024-03-07)

#### New Backend Endpoints
- `GET /api/stats/dashboard` - Aggregated dashboard statistics with workspace/session/run counts
- `GET /api/health/services` - System health status for all backend services

#### New Frontend Files
- `frontend/src/app/api/stats/dashboard/route.ts` - API proxy for dashboard stats
- `frontend/src/app/api/health/services/route.ts` - API proxy for health checks

#### UI Rename: Codex → Agents
- Sidebar tab renamed from "Codex" to "Agents"
- Runner dropdown: "Codex (OpenAI)" → "OpenAI Agent"
- Runner dropdown: "Claude (Anthropic)" → "Claude Agent"
- All UI references updated consistently

#### Dark Mode Support
- Full dark mode with Tailwind `darkMode: "class"`
- High contrast text for readability
- Sidebar active states with proper contrast
- Form inputs, scrollbars, code blocks styled for dark mode
- Theme switching applies immediately via Settings

#### Favicon
- Added SC (SaaS Codex) favicon with blue-purple gradient

#### Modified Files
- `frontend/src/app/(app)/dashboard/page.tsx` - Complete rewrite with real metrics and activity feed
- `frontend/src/app/(app)/projects/page.tsx` - Complete rewrite with workspace cards and search
- `frontend/src/app/(app)/settings/page.tsx` - Complete rewrite with sidebar navigation and forms
- `frontend/src/components/Sidebar.tsx` - Dark mode classes, Agents rename
- `frontend/src/app/globals.css` - Dark mode CSS styles
- `frontend/tailwind.config.js` - Enable darkMode: "class"
- `frontend/public/favicon.svg` - New favicon
- `backend/app/main.py` - Added DashboardStatsResponse, SystemHealthResponse endpoints

---

## v0.2.6 (Jan 18, 2026)

### Click-to-Load Run History

This release adds the ability to click on run history items to load their prompt and response.

#### Features
- **Clickable Run History**: Run history items in Codex page are now clickable
- **Load Prompt**: Clicking a run loads its prompt into the Prompt field
- **Load Events**: Clicking a run loads its persisted events into the Output area
- **Visual Feedback**: Selected run highlighted with blue background/border

#### New Endpoints
- `GET /api/runs/{run_id}/detail` - Returns run prompt, status, and all persisted events

#### New Files
- `frontend/src/app/api/runs/[runId]/detail/route.ts` - API proxy for run detail

---

## v0.2.5 (Jan 18, 2026)

### UI/UX Improvements & Bug Fixes

This release focuses on improving the user experience when switching between tabs and fixing several bugs.

#### Features
- **Shared App Context**: React context that persists state across tab switches
- **Sidebar Navigation Fix**: Active tab highlight now properly follows clicks using `usePathname`
- **Thread Recovery**: Backend automatically recreates expired runner threads after container restart
- **Codex Message Persistence**: Codex prompts and responses now saved to messages table
- **URL State Sync**: Workspace and session IDs synced to URL params for bookmarking

#### Bug Fixes
- Fixed Chat UI not displaying responses from Codex runner (event parsing)
- Fixed tab state resetting when switching between Chat and Codex tabs
- Fixed sidebar highlight staying on wrong tab after navigation
- Fixed 502 error when using sessions created before container restart

#### New Files
- `frontend/src/contexts/AppContext.tsx` - Shared state context for all pages

#### Technical Changes
- Backend `prompt` endpoint now handles "thread not found" by recreating thread
- Added `update_thread_id` method to SessionRepository
- Both Chat and Codex pages now use shared AppContext
- Sidebar uses `usePathname` instead of `window.location.pathname`
- Added TypeScript path aliases (`@/*`) to tsconfig.json

---

## v0.2.4 (Jan 18, 2026)

### Enterprise Chat UI

This release introduces a dedicated `/chat` page with a ChatGPT/Claude-style conversational interface.

#### Features
- **Chat UI**: Full-height chat layout with vertical message flow
- **Message bubbles**: User messages (blue, right), assistant (white, left)
- **Markdown rendering**: Full GFM support with tables, lists, blockquotes
- **Syntax highlighting**: Prism code blocks with dark theme
- **Tool call cards**: Collapsible cards showing tool name, input, output
- **Real-time streaming**: Typing indicator during AI response
- **Message persistence**: All conversations saved to `messages` table
- **History loading**: Chat history loads when selecting existing session
- **Multi-session**: Switch between sessions, create new ones
- **Keyboard shortcuts**: Enter to send, Shift+Enter for new line

#### New Database Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    run_id UUID REFERENCES runs(id),
    role VARCHAR(20),  -- user, assistant, tool, system
    content TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ
);
```

#### New Endpoints
- `GET /api/sessions/{id}/messages` - List all messages for a session
- `POST /api/sessions/{id}/messages` - Create a new message

#### New Files
- `frontend/src/app/(app)/chat/page.tsx` - Chat UI page
- `frontend/src/app/(app)/chat/layout.tsx` - Chat layout
- `backend/app/repositories/message_repo.py` - MessageRepository
- `frontend/src/app/api/sessions/[sessionId]/messages/route.ts` - API proxy

#### Dependencies
- Added `react-syntax-highlighter` for code block highlighting

---

## v0.2.3 (Jan 18, 2026)

### Real-Time Workspace Sync

This release ensures the workspace dropdown always reflects the actual filesystem state.

#### Features
- **Real-time sync**: Dropdown filters out workspaces whose folders have been deleted
- **Cache bypass**: All frontend API routes use `cache: no-store` for fresh data
- **Orphan handling**: Workspaces with missing folders are automatically hidden

#### Bug Fixes
- Fixed Next.js caching issue causing stale workspace list after import
- Fixed dropdown not updating after local folder import

#### Technical Changes
- Backend `/api/workspaces` now checks `pathlib.Path(ws.local_path).exists()` before including workspace
- Frontend API proxy routes updated with `cache: "no-store"`

---

## v0.2.2 (Jan 18, 2026)

### Local Folder Import

This release adds the ability to import manually copied project folders.

#### Features
- **Scan Local**: New button to discover unregistered folders in `/workspaces`
- **Import Modal**: View discovered folders with git info and bulk import
- **Custom Names**: Set display names during import
- **Git Detection**: Automatically detects git repos and extracts remote URL

#### New Endpoints
- `GET /api/workspaces/scan` - Discover unregistered folders
- `POST /api/workspaces/import-local` - Register local folder as workspace

#### Usage
```bash
# Copy any project to workspaces
mkdir -p workspaces/my-project/repo
cp -r /path/to/project/* workspaces/my-project/repo/

# In UI: Click "🔍 Scan" → Select folder → Import
```

---

## v0.2.1 (Jan 18, 2026)

### Database Integration & Fixes

#### Features
- **PostgreSQL persistence**: Repository pattern with SQLAlchemy async ORM
- **Workspace auto-import**: Scans `/workspaces` on startup
- **Session continuation**: UI to select and continue existing sessions

#### Bug Fixes
- Fixed transcript parsing for Codex event types (`item.completed`, `command_execution`)
- Fixed CSS static assets for standalone Docker mode

---

## v0.2.0 (Jan 2026)

### Multi-Runner Support

Initial v0.2.0 release with multi-runner architecture.

#### Features
- **Codex Runner**: OpenAI Codex agent with SSE streaming
- **Claude Runner**: Anthropic Claude agent with tool use
- **Workspace Registry**: Import and manage GitHub repositories
- **Session Management**: Create, list, and continue sessions
- **Transcript UI**: Markdown rendering with tool call display
- **SSE Streaming**: Reliable event streaming with anti-buffering

#### Microservices (Placeholders)
- Prompt Manager
- Evaluation Service
- Memory Service
- LLM Gateway

---

## Upgrade Notes

### From v0.2.2 to v0.2.3
No breaking changes. Rebuild frontend container to get cache bypass fix.

### From v0.2.1 to v0.2.2
No breaking changes. New scan/import features are additive.

### From v0.2.0 to v0.2.1
Database migration required:
```bash
cd backend
alembic upgrade head
```
