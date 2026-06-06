# Release Notes

## v0.7.1 — RBAC + E2E Streaming + Bug Fixes (Feb 9, 2026)

Release name: **rbac-streaming-v07**

**Status**: ✅ Released  
**Tag**: `v0.7.1`  
**Branch**: `main` (merged from `feature/rbac-streaming-v07`)  
**Commits**: 23 files changed, +1,601 / −662 lines

### Summary

This release consolidates all v0.7.x work into a single stable release on `main`:

- **5-role RBAC system** — `super_admin → org_admin → project_admin → editor → viewer` with tenant-scoped resource filtering
- **Real-time SSE streaming** — full Codex SDK (`item.started/updated/completed`) and Claude SDK (`ui.message.assistant.delta`) event rendering
- **Session persistence** — active runs survive page navigation and hard refresh via `sessionStorage` + SSE reconnect
- **Role-gated UI** — sidebar admin tabs, user management columns, and action buttons filtered by role level
- **Critical bug fixes** — `useAuth` crash on User Management page, role change 422 error, admin tabs not showing

### Bug Fixes (since v0.7.0)

- **Role change 422 error** — Next.js admin API proxy was dropping query parameters on POST requests; the `change_user_role` endpoint expects `?role=xxx` as a query param. Fixed by forwarding `searchParams` in the POST handler.
- **User Management crash** — `useAuth()` called outside `AuthProvider`; fixed by adding `providers.tsx` client wrapper to root layout.
- **Admin tabs missing** — `super_admin`/`org_admin` roles not recognized by sidebar; fixed with `isAdminRole()` helper.
- **Role change `[object Object]`** — error detail safely stringified in alert dialog.
- **prompt-manager `is_admin`** — updated to accept new RBAC roles.

### Full Changelog

See v0.7.0 entry below for complete RBAC system, streaming architecture, event type tables, session persistence details, and file-level change list.

---

## v0.7.0 — RBAC Phase 1 + E2E Streaming (Feb 9, 2026)

Release name: **rbac-streaming**

**Status**: ✅ Superseded by v0.7.1  
**Branch**: `feature/rbac-streaming-v07`

### Highlights

- **5-role RBAC system** with tenant-scoped resource filtering — `super_admin → org_admin → project_admin → editor → viewer`
- **Tenant-scoped API filtering** — non-super-admins only see their own tenant's resources + platform resources
- **Real-time SSE streaming** — full support for both OpenAI Codex SDK and Claude Anthropic SDK streaming events
- **Session persistence** — active runs survive page navigation and browser refresh via `sessionStorage` + SSE reconnect
- **Role-gated UI** — sidebar admin tabs, user management columns, and action buttons filtered by role level

### RBAC System

| Feature | Status | Details |
|---------|--------|---------|
| Migration 005 | ✅ | Expand `User.role` constraint to 5 roles, auto-migrate legacy `admin`→`super_admin`, `user`→`editor` |
| `rbac.py` module | ✅ | `tenant_filter()`, `has_min_role()`, `require_role()` factory, `is_super_admin()` |
| Tenant seeding | ✅ | 2 sample tenants (NHS Birmingham Trust, Enterprise Corp) + 8 groups on startup |
| JWT claims | ✅ | `tenant_id` included in JWT payload for all authenticated users |
| Workspace list | ✅ | Tenant-scoped via `tenant_filter()` — super_admin sees all |
| Resource auto-tagging | ✅ | Workspace/session creation auto-sets `tenant_id` from current user |
| Admin users scoping | ✅ | Org admins see only their own tenant's users |
| prompt-manager auth | ✅ | `is_admin` updated to accept `super_admin`, `org_admin` roles |
| Change role endpoint | ✅ | `POST /api/admin/users/{id}/role` with role hierarchy enforcement |
| Assign tenant endpoint | ✅ | `POST /api/admin/users/{id}/tenant` (super_admin only) |

### E2E Streaming Architecture

Both runners stream events in real-time through a unified SSE pipeline:

```
Runner (Codex/Claude) → Backend (httpx proxy) → Frontend (EventSource)
```

| Runner | SDK | Streaming Method | Event Types |
|--------|-----|-----------------|-------------|
| **Codex** (`runner/`) | `@openai/codex-sdk` | `thread.runStreamed()` → `AsyncGenerator<ThreadEvent>` | `item.started`, `item.updated`, `item.completed` |
| **Claude** (`claude-runner/`) | `anthropic` | `client.messages.stream()` | `ui.message.assistant.delta`, `ui.tool.call`, `ui.tool.result` |

#### Codex SDK Event Types (Now Rendered in UI)

| Item Type | UI Display |
|-----------|-----------|
| `reasoning` | Agent's thinking text (streaming) |
| `command_execution` | Live shell command + stdout/stderr |
| `file_change` | Files being added/deleted/updated |
| `mcp_tool_call` | MCP tool invocations with args + results |
| `todo_list` | Agent's checklist plan (✅/⬜ items) |
| `agent_message` | Final markdown response |

#### Claude Runner Event Types

| Event Type | UI Display |
|-----------|-----------|
| `ui.message.assistant.delta` | Token-by-token text streaming |
| `ui.tool.call.start` / `ui.tool.call` | Active tool with spinner + input |
| `ui.tool.result` | Tool execution result |
| `ui.message.assistant.final` | Complete markdown response |

### Session Persistence

| Scenario | Mechanism |
|----------|-----------|
| Navigate away and back (SPA) | `AppContext` preserves `runId`/`status`; reconnects to live SSE stream |
| Hard browser refresh | `sessionStorage` recovers `runId`; reconnects to SSE (runner replays buffer) |
| Run completes while away | SSE replay delivers all buffered events, then `stream.closed` |

### Frontend

| Feature | Status | Details |
|---------|--------|---------|
| `AuthProvider` wrapper | ✅ | `providers.tsx` wraps root layout — fixes `useAuth` crash |
| Role helpers | ✅ | `hasMinRole()`, `isSuperAdmin()`, `isAdminRole()` in `lib/auth.ts` |
| AuthContext | ✅ | Exposes `isSuperAdmin`, `hasMinRole()` to all components |
| Sidebar role gating | ✅ | Admin items filtered by `minRole` (Skills→`project_admin+`, Users/Hooks→`org_admin+`) |
| Admin Users page | ✅ | Role dropdown (5 roles), tenant dropdown (super_admin only), color-coded badges |
| Codex event rendering | ✅ | `item.started/updated/completed` for reasoning, commands, file changes, todo lists |
| Claude event rendering | ✅ | `ui.message.assistant.delta` for token-by-token streaming |
| SSE reconnect | ✅ | `sessionStorage` persistence + live stream reconnection on page return |

### Bug Fixes

- **User Management crash** — `useAuth()` called outside `AuthProvider`; fixed by adding `providers.tsx` client wrapper to root layout
- **Admin tabs missing** — `super_admin`/`org_admin` roles not recognized; fixed with `isAdminRole()` helper
- **Role change `[object Object]`** — error detail safely stringified in alert dialog
- **prompt-manager `is_admin`** — updated to accept new RBAC roles

### Database Changes

- **Migration 005** (`005_expand_rbac_roles.py`): Expand `chk_role` constraint to `(super_admin, org_admin, project_admin, editor, viewer)`, migrate existing data
- **No new tables** — all tenant/group/workspace_access tables already existed from v0.4.0

### Design Documents

- **`RBAC_Design.md`** — Merged and consolidated from two separate docs into single master reference

### New/Modified Files

| File | Change |
|------|--------|
| `backend/app/auth/rbac.py` | Rewritten: `tenant_filter()`, `has_min_role()`, `require_role()` |
| `backend/alembic/versions/005_expand_rbac_roles.py` | New migration |
| `frontend/src/app/providers.tsx` | New: client-side `AuthProvider` wrapper |
| `frontend/src/app/layout.tsx` | Wrap children in `<Providers>` |
| `frontend/src/lib/auth.ts` | Added `hasMinRole()`, `isSuperAdmin()`, role hierarchy |
| `frontend/src/contexts/AuthContext.tsx` | Expose `isSuperAdmin`, `hasMinRole` |
| `frontend/src/components/Sidebar.tsx` | Role-gated admin items with `minRole` |
| `frontend/src/app/(app)/admin/users/page.tsx` | Role/tenant dropdowns, super_admin gating |
| `frontend/src/app/(app)/codex/page.tsx` | Codex SDK event handling, SSE reconnect, sessionStorage |
| `prompt-manager/app/auth.py` | Fix `is_admin`/`is_super_admin` for new roles |
| `docs/RBAC_Design.md` | Consolidated master RBAC design doc |

---

## v0.6.9 — Prompt & Skills Manager (Feb 9, 2026)

Release name: **prompt-skills-manager**

**Status**: ✅ Released  
**Tag**: `v0.6.9`  
**Branch**: `feature/prompt-skills-manager`  
**Commits**: 38 files changed, +5,572 lines

### Highlights

- New **Prompt & Skills Manager** microservice — a standalone FastAPI service with full PostgreSQL persistence, JWT authentication, and multi-tenant RBAC
- **Prompts tab** (`/prompts`) in sidebar with template CRUD, category filtering, full-text search, and `{{variable}}` rendering
- **Edit & Version Control** — every template update creates a new immutable version with change summary; full version history viewer
- **Template picker** dropdown in Agent Console prompt area with variable fill modal
- **Clone** templates with one click for rapid iteration
- **10 seed platform templates** auto-loaded on first startup covering sales, project management, architecture, development, QA, product, support, and compliance
- **Skills CRUD API** with versioning, multi-tenant RBAC, file-sync from `claude-runner/skills/`
- **E2E test suite** — 21 Python API tests + 11 Playwright UI tests, all running inside Docker
- **Favicon fix** — PNG fallback for all browsers via Next.js dynamic route handlers

### Backend — prompt-manager Microservice

A new independently deployable FastAPI microservice (`prompt-manager`) sharing the same PostgreSQL instance but managing its own tables and Alembic migration chain.

| Feature | Status | Details |
|---------|--------|---------||
| SQLAlchemy ORM models | ✅ | `prompt_templates`, `skills`, `template_usage_log` with UUID PKs, JSONB fields |
| Alembic migration 001 | ✅ | Initial schema with constraints, indexes, unique slugs per tenant+version |
| Template CRUD API | ✅ | List (paginated, filtered), Get, Create, Update (versioned), Delete (soft archive) |
| Template Render API | ✅ | `{{variable}}` substitution with unresolved variable cleanup |
| Template Publish/Clone | ✅ | Status lifecycle: `draft` → `published` → `archived` / `deprecated` |
| Template Version History | ✅ | `GET /templates/{id}/versions` returns all versions ordered by version number |
| Skills CRUD API | ✅ | List, Get, Create, Update (versioned), Delete, Toggle enable/disable |
| Skills Sync from Files | ✅ | Import `claude-runner/skills/` YAML+MD into DB on demand |
| Categories API | ✅ | List all categories with template/skill counts |
| Usage Analytics | ✅ | Log template usage events, get aggregate stats |
| JWT Auth Middleware | ✅ | Shared secret with backend service, role extraction from token claims |
| RBAC Visibility | ✅ | `private` / `team` / `tenant` / `public` filtering based on user context |
| Auto-seed on Startup | ✅ | 10 platform templates seeded when `prompt_templates` table is empty |
| Docker Compose | ✅ | Port 8083 internal / 9105 external, `depends_on: postgres`, skills volume mount |

### Frontend

| Feature | Status | Details |
|---------|--------|---------||
| Next.js API Proxy | ✅ | `/api/prompt-manager/[...path]` → `http://prompt-manager:8083` with auth header forwarding |
| Prompts List Page | ✅ | `/prompts` with category dropdown, status filter, full-text search, card layout |
| New Template Modal | ✅ | Create with name, description, category, visibility, template body |
| Edit Template Modal | ✅ | Edit body/description with mandatory change summary; auto-increments version |
| Version History Modal | ✅ | View all versions with timestamps, status badges, expandable template bodies |
| Use Template Modal | ✅ | Variable fill with typed inputs, live preview, Copy to clipboard, Send to Agent |
| Clone Button | ✅ | One-click template duplication |
| Template Picker | ✅ | `📝 Use Template` dropdown in Agent Console prompt area |
| Variable Fill Modal | ✅ | Typed inputs: `string`, `text`, `enum` (dropdown), `date`, `number` |
| sessionStorage Prefill | ✅ | Prompts page → Agent Console seamless prompt transfer |
| Sidebar Navigation | ✅ | `📝 Prompts` link added to main navigation |
| AboutModal | ✅ | Version history and key features updated |
| Favicon (PNG) | ✅ | `icon.tsx` (32×32) + `apple-icon.tsx` (180×180) dynamic route handlers |
| Dockerfile | ✅ | Fixed: `public/` directory now copied into standalone build |

### Seed Templates (10)

| Template | Category | Variables | Description |
|----------|----------|-----------|-------------|
| NHS SoW Generator | sales | 8 | Statement of Work for NHS/enterprise customers |
| Project Charter | project-management | 5 | Project initiation and charter documents |
| Architecture Decision Record | architecture | 5 | ADR with context, decision, and consequences |
| Code Review Checklist | development | 4 | Structured code review with language-specific focus |
| Test Strategy Document | qa | 5 | Comprehensive test strategy and planning |
| PRD Writer | product | 6 | Product Requirements Document generator |
| User Guide Generator | support | 5 | End-user documentation with screenshots |
| NHS Compliance Audit | compliance | 4 | NHS Digital compliance audit checklist |
| Weekly Status Report | project-management | 8 | RAG status report with risks and actions |
| API Design Specification | architecture | 5 | REST/GraphQL API design with OpenAPI spec |

### Database Changes

- **New tables** (prompt-manager Alembic `001_prompt_skills_tables`):
  - `prompt_templates` — UUID PK, JSONB `variables`/`sample_values`, versioning fields, unique constraint on `(tenant_id, slug, version)`
  - `skills` — UUID PK, JSONB `parameters`, versioning, enable/disable toggle
  - `template_usage_log` — Usage tracking with template/user/tenant references
- **Separate Alembic chain**: prompt-manager manages its own `alembic_version` row, independent of backend migrations
- **No changes** to existing backend tables (migrations 001–004 unchanged)
- Tables also created via `Base.metadata.create_all()` on startup for development convenience

### Bug Fixes

- **JWT Secret Key alignment**: Backend and prompt-manager now share the same default secret (`dev-secret-key-change-in-production`) via `JWT_SECRET_KEY` env var in `docker-compose.yml`
- **Template picker dropdown**: Now correctly closes after clicking "Apply to Prompt" in Agent Console
- **Favicon not showing**: `public/` directory was missing from Docker build; added `COPY public /app/public` and `cp -r public .next/standalone/public` to Dockerfile

### Testing

| Test Suite | Tests | Runner | Description |
|------------|-------|--------|-------------|
| `tests/test_prompt_manager_api.py` | 21 | Python (httpx) | Health, auth, CRUD lifecycle, render, clone, skills, categories, usage |
| `tests/e2e/prompts.spec.ts` | 11 | Playwright | Prompts page navigation, templates display, modals, Agent Console picker, API proxy |

**Run API tests**:
```bash
docker compose exec prompt-manager python /app/tests/test_prompt_manager_api.py -v
```

### New Files

| File | Purpose |
|------|---------|
| `prompt-manager/app/models.py` | SQLAlchemy ORM: `PromptTemplate`, `Skill`, `TemplateUsageLog` |
| `prompt-manager/app/schemas.py` | Pydantic request/response schemas with variable definitions |
| `prompt-manager/app/auth.py` | JWT middleware with role extraction and RBAC helpers |
| `prompt-manager/app/database.py` | Async SQLAlchemy engine and session factory |
| `prompt-manager/app/seeds.py` | 10 platform seed templates with variables and sample values |
| `prompt-manager/app/repositories/` | Repository pattern: `template_repo`, `skill_repo`, `usage_repo` |
| `prompt-manager/app/routers/` | API routers: `templates`, `skills`, `categories`, `usage` |
| `prompt-manager/alembic/` | Migration chain with `001_prompt_skills_tables.py` |
| `frontend/src/app/(app)/prompts/page.tsx` | Prompts list page with all modals |
| `frontend/src/app/api/prompt-manager/[...path]/route.ts` | Next.js API proxy to prompt-manager |
| `frontend/src/app/icon.tsx` | Dynamic PNG favicon (32×32) |
| `frontend/src/app/apple-icon.tsx` | Dynamic Apple touch icon (180×180) |
| `docs/Prompt_Skills_Manager_Design.md` | Full design specification |
| `tests/test_prompt_manager_api.py` | Python API E2E test suite |
| `tests/e2e/prompts.spec.ts` | Playwright UI E2E test suite |

---

## v0.6.8 — UI Polish & Multi-Agent SDKs (Feb 8, 2026)

Release name: **ui polish**

**Status**: ✅ Released  
**Tag**: `v0.6.8`

### Changes

- **Collapsible Sidebar**: Click logo to collapse/expand, with dark mode support
- **Multi-Agent SDK Dropdown**: 7 runners (Claude, OpenAI, Gemini, Azure, Bedrock, OpenLI, Custom)
- **Updated Branding**: Generic SDK descriptions, NHS/HIPAA compliance mentions
- **Dark Mode Fixes**: High contrast text in sidebar and navigation
- **Admin Links**: Skills and Hooks added to sidebar admin section

### Runner SDKs

| Runner | Status | Description |
|--------|--------|-------------|
| Claude Agent | ✅ Available | Anthropic Claude SDK |
| OpenAI Agent | ✅ Available | OpenAI Codex SDK |
| Gemini Agent | 🔜 Coming Soon | Google Gemini SDK |
| Azure OpenAI | 🔜 Coming Soon | Azure OpenAI Service |
| AWS Bedrock | 🔜 Coming Soon | AWS Bedrock Claude |
| OpenLI Agent | 🔜 Coming Soon | Custom LI Agent SDK |
| Custom Agent | 🔜 Coming Soon | Self-hosted LLM/SLM |

---

## v0.6.7 — OpenLI Codex Branding Update (Feb 8, 2026)

Release name: **openli branding**

**Status**: ✅ Released  
**Tag**: `v0.6.7`

### Changes

- Updated branding from "OpenLi" to "OpenLI" (uppercase LI)
- Consistent trademark naming across all UI and documentation

---

## v0.6.6 — OpenLI Codex Rebrand & IP Protection (Feb 8, 2026)

Release name: **openli rebrand**

**Status**: ✅ Released  
**Tag**: `v0.6.6`

### Highlights

- Rebranded from "SaaS Codex" to **OpenLI Codex**
- Dual licensing (AGPL-3.0 + Commercial)
- IP protection with copyright headers and CLA
- Comprehensive licensing documentation

### Naming Structure

| Level | Name | Purpose |
|-------|------|---------|
| **Platform** | OpenLI | The open enterprise AI agent ecosystem |
| **Product** | OpenLI Codex | The core agent/codex platform |
| **Vertical** | OpenLI ClinCodex | Healthcare/NHS vertical |
| **Vertical** | OpenLI FinCodex | Banking/Finance vertical |
| **Vertical** | OpenLI PharmaCodex | Pharma vertical |

### License Model

| Tier | Criteria | License | Cost |
|------|----------|---------|------|
| Community | Revenue < £250K | AGPL-3.0 | Free |
| SME Sponsor | Revenue £250K-£2M | Commercial Lite | £500/year |
| Enterprise | Revenue > £2M | Commercial | Custom |

### New/Updated Files

- `LICENSE` - Dual license (AGPL-3.0 + Commercial)
- `docs/LICENSING_STRATEGY.md` - IP protection guide
- `docs/Deployment_Quick_Notes.md` - Quick reference
- `README.md` - Updated with OpenLi branding
- UI components updated with OpenLi Codex branding

### Contact

**Lightweight Integration Ltd**  
Email: Zhong@li-ai.co.uk

---

## v0.6.5 — UI Enhancements & RBAC Display (Feb 8, 2026)

Release name: **ui polish**

**Status**: ✅ Released  
**Tag**: `v0.6.5`

### Highlights

- New app favicon and branding
- About modal with version history
- Settings menu with sample users and RBAC display
- Enhanced navigation bar with logo

### New Features

#### App Branding
- Modern AI-themed favicon (brain/circuit icon)
- Updated browser tab title: "SaaS Codex | Enterprise AI Agent Platform"
- Gradient logo in navigation bar

#### About Modal (click logo or ℹ️ icon)
- Current version and build date display
- Key features list
- Technology stack badges
- **Version History tab** with all releases and features

#### Settings & RBAC Menu (⚙️ icon)
- **Sample Users tab**: 8 sample users across 3 tenants
  - Platform Admin (Super Admin)
  - NHS Birmingham Trust users (Org Admin, Project Admin, Editor)
  - Enterprise Corp users (Org Admin, Editor, Viewer)
  - Pending user for approval workflow demo
- **User Groups tab**: 8 groups with permissions
  - Super Admins, Org Admins, Project Managers
  - Developers, Sales, Architecture, Clinical Leads, Stakeholders
- **RBAC Matrix tab**: Visual permission matrix
  - 3-tier hierarchy diagram
  - Resource × Role permission table

### New Files

- `frontend/src/components/AboutModal.tsx` - About modal with version history
- `frontend/src/components/SettingsMenu.tsx` - Settings menu with RBAC display

### Updated Files

- `frontend/public/favicon.svg` - New AI-themed favicon
- `frontend/src/app/layout.tsx` - Updated metadata and title
- `frontend/src/components/TopNav.tsx` - Logo, About, Settings buttons

---

## v0.6.4 — Skills/Hooks Admin UI & RBAC (Feb 8, 2026)

Release name: **admin ui & rbac**

**Status**: ✅ Released  
**Tag**: `v0.6.4`

### Highlights

- Skills Management Admin UI with CRUD operations
- Hooks Configuration Admin UI
- 3-tier RBAC design (Super Admin, Org Admin, End Users)
- Agent Console UI improvements (sidebar layout, adaptive sizing)
- E2E test suite with Playwright

### New Features

#### Skills Management UI (`/admin/skills`)
- List all platform/tenant/project skills
- View skill details and SKILL.md content
- Create new skills with name validation
- Edit skills with version tracking
- Delete skills with confirmation
- Reload skills in runner

#### Hooks Configuration UI (`/admin/hooks`)
- View platform security hooks (blocked patterns)
- View platform audit hooks
- Configure tenant compliance hooks (NHS, PII detection)
- Configure tenant quality hooks

#### Agent Console Improvements
- Sidebar + main content layout
- Resizable prompt textarea
- Adaptive output area
- Better spacing and shadows

### RBAC Design

| Role | Platform Skills | Tenant Skills | Project Skills |
|------|-----------------|---------------|----------------|
| Super Admin | CRUD | CRUD | CRUD |
| Org Admin | View | CRUD | CRUD |
| Project Admin | View | View | CRUD |
| User | Use | Use | Use |

### New Files

- `frontend/src/app/(app)/admin/skills/page.tsx` - Skills Management UI
- `frontend/src/app/(app)/admin/hooks/page.tsx` - Hooks Configuration UI
- `frontend/src/app/api/claude/skills/` - Skills API proxy routes
- `claude-runner/app/api/skills_router.py` - Skills CRUD API
- `backend/app/auth/rbac.py` - RBAC middleware
- `docs/RBAC_Design.md` - Detailed RBAC design document
- `tests/e2e/skills.spec.ts` - Playwright E2E tests for Skills
- `tests/e2e/hooks.spec.ts` - Playwright E2E tests for Hooks

### Documentation

- **`docs/RBAC_Design.md`** - 3-tier RBAC architecture
- **`docs/Skills_Hooks_UI_Design.md`** - UI design specifications

---

## v0.6.3 — Enterprise Skills Architecture (Feb 8, 2026)

Release name: **skills architecture**

**Status**: ✅ Released  
**Tag**: `v0.6.3`

### Highlights

- Enterprise Skills Architecture Design for Virtual Software House
- Role-based Skills for 7 enterprise roles
- Three-tier Skills hierarchy (Platform > Tenant > Project)
- 6 new professional deliverable Skills

### New Skills

| Skill | Role | Deliverable |
|-------|------|-------------|
| `sow-generator` | Sales | Statement of Work (NHS/Enterprise) |
| `project-charter` | Project Manager | Project initiation documents |
| `prd-writer` | Product Manager | Product Requirements Documents |
| `architecture-design` | Architect | C4 diagrams, technical specs |
| `test-strategy` | QA | Test strategy and planning |
| `user-guide` | Support | End-user documentation |

### Skills Architecture

```
Platform Skills (/app/skills/)
    ↓ overridden by
Tenant Skills ({workspace}/.claude/skills/)
    ↓ overridden by
Project Skills ({project}/.claude/skills/)
```

### Documentation

- **`docs/Skills_Architecture_Design.md`** - Complete architecture design

---

## v0.6.2 — Test Documentation & Enhanced Hooks (Feb 8, 2026)

Release name: **testing & docs**

**Status**: ✅ Released  
**Tag**: `v0.6.2`

### Highlights

- Comprehensive test documentation with requirements, strategy, and user guide
- Enhanced hooks system with structured placeholders for future extension
- Automated E2E test script for v0.6.x feature verification
- New `e2e-test` skill for automated testing

### New Documentation

- **`docs/Testing_Guide.md`** - Complete testing documentation:
  - Test Requirements (13 functional + 4 non-functional)
  - Test Strategy (Unit, Integration, E2E levels)
  - Test Environment Setup
  - Running Tests (automated + manual)
  - Test Coverage Matrix
  - Extending Tests Guide
  - Test Reports

### Enhanced Hooks System

- Restructured `hooks.py` with categorized sections:
  - Security Hooks (13 blocked bash patterns)
  - Compliance Hooks (placeholder for data policies)
  - Audit Hooks (basic logging implemented)
  - Rate Limit Hooks (placeholder)
  - Custom Hooks (placeholder for tenant-specific rules)
- Added `chown root` to blocked patterns
- Added audit logging to `post_tool_use_hook`

### New Test Infrastructure

- **`scripts/test_v061_features.sh`** - Automated test script
- **`claude-runner/skills/e2e-test/SKILL.md`** - E2E test skill

### Test Results

```
═══════════════════════════════════════════════════════════════
  TEST SUMMARY
═══════════════════════════════════════════════════════════════
  Passed: 18
  Failed: 0
  ✅ ALL TESTS PASSED!
```

---

## v0.6.1 — Runner Selection Fix + Feature Verification (Feb 8, 2026)

Release name: **hotfix + verification**

**Status**: ✅ Released  
**Tag**: `v0.6.1`

### Bug Fix

**Issue**: When user selected "Claude Agent" from the dropdown and created a session, the session was always stored as `codex` in the database, causing all requests to go to the OpenAI Codex runner instead of Claude.

**Root Cause**: `useState` initialized `runnerType` to `"codex"` and localStorage was loaded asynchronously via `useEffect`, causing a race condition where the session was created before the localStorage value was applied.

**Fix**:
- `AppContext.tsx`: Use lazy initialization with `getInitialRunnerType()` to load from localStorage synchronously during initial render
- `codex/page.tsx`: Remove `useEffect` that auto-synced runner type from session (was overwriting user's dropdown selection)

### Feature Implementation Status

| Feature | Status | Verified |
|---------|--------|----------|
| Claude Agent SDK Migration | ✅ Done | ✅ `claude-agent-sdk>=0.1.30` available in container |
| Skills System (global + workspace) | ✅ Done | ✅ 3 global skills loaded |
| Hooks (pre-tool-use validation) | ✅ Done | ✅ Blocks dangerous commands |
| Global Skills Created | ✅ Done | ✅ `code-review`, `security-audit`, `healthcare-compliance` |
| UI/UX Streaming Events | ✅ Done | ✅ New event types handled |
| Transcript Rendering | ✅ Done | ✅ Skill badges, iteration bars, blocked styling |

### How to Test

#### 1. Runner Switching
```bash
# Verify Claude session stored correctly
docker compose exec -T postgres psql -U saas -d saas -c \
  "SELECT id, runner_type FROM sessions ORDER BY created_at DESC LIMIT 3;"
```

#### 2. Skills System
```bash
# Check global skills are loaded
docker compose exec -T claude-runner ls -la /app/skills/
# Expected: code-review/, security-audit/, healthcare-compliance/
```

#### 3. Hooks (Dangerous Command Blocking)
- Run prompt: `"Execute: rm -rf /"`
- **Expected**: Red "🚫 BLOCKED" message with reason

#### 4. UI Streaming Events
- Run any prompt with Claude runner
- **Expected**: Purple skill badges, iteration progress bars

### Verified

- ✅ Database correctly stores `runner_type: 'claude'` for Claude sessions
- ✅ Claude-runner logs show `POST /threads`, `POST /runs`, `GET /runs/.../events`
- ✅ E2E test successful with Claude response
- ✅ Skills loaded from `/app/skills/` directory
- ✅ Hooks block dangerous bash patterns

---

## v0.6.0 — Claude Agent SDK Uplift (Feb 7, 2026)

Release name: **agent sdk**

**Status**: ✅ Released  
**Tag**: `v0.6.0`

### Highlights

- Migrate Claude runner to official `claude-agent-sdk` (with Anthropic SDK fallback)
- Claude Skill files (global + per-workspace)
- Pre/post tool use hooks for validation and security
- True E2E streaming in UI with new event types
- **No impact on existing OpenAI Codex runner** — both runners are plug-and-play interchangeable

### Features

- **Claude Agent SDK Migration**
  - Replace `anthropic` SDK with `claude-agent-sdk>=0.1.30`
  - Fallback to basic Anthropic SDK if Agent SDK unavailable
  - Built-in agent loop with typed messages
  - Native streaming and session management

- **Claude Skill Files**
  - Global skills: `claude-runner/skills/*/SKILL.md` (bundled in Docker image)
  - Workspace skills: `{workspace}/.claude/skills/*/SKILL.md`
  - Built-in skills: `code-review`, `security-audit`, `healthcare-compliance`
  - YAML frontmatter for skill metadata (name, description, allowed-tools)

- **Pre/Post Tool Hooks**
  - PreToolUse: Block dangerous bash commands (`rm -rf`, `sudo`, `curl | sh`, etc.)
  - PreToolUse: Block path traversal (`..` in file paths)
  - PostToolUse: Audit logging with timestamps
  - Configurable via `ENABLE_HOOKS` environment variable

- **UI/UX E2E Streaming**
  - New SSE events: `ui.skill.activated`, `ui.iteration`, `ui.tool.blocked`
  - Skill activation badges in transcript (purple)
  - Iteration progress bar
  - Blocked tool highlighting (red)
  - Collapsible tool input/output sections with max-height

- **Authentication**
  - API key authentication via `ANTHROPIC_API_KEY` (**recommended**)
  - Cloud provider support: AWS Bedrock, Google Vertex AI, Microsoft Azure
  - ⚠️ Browser login / OAuth **not supported** for third-party apps (Anthropic policy)

### Files Changed

| File | Change |
|------|--------|
| `claude-runner/requirements.txt` | Added `claude-agent-sdk`, `pyyaml`, `anyio` |
| `claude-runner/app/agent.py` | Rewritten with SDK support + fallback |
| `claude-runner/app/skills.py` | New skill loader module |
| `claude-runner/app/hooks.py` | New pre/post tool validation module |
| `claude-runner/app/config.py` | Added `GLOBAL_SKILLS_PATH`, `ENABLE_HOOKS`, `MAX_AGENT_TURNS` |
| `claude-runner/Dockerfile` | Copies skills directory, sets env vars |
| `claude-runner/skills/*/SKILL.md` | 3 global skill files |
| `frontend/.../codex/page.tsx` | Extended transcript types, new event handling |
| `frontend/.../chat/page.tsx` | Extended metadata types, new event handling |

### Regression Testing

✅ **OpenAI Codex runner**: Completely untouched, no changes to `runner/src/server.ts`  
✅ **Backend API**: No changes to runner dispatch logic  
✅ **Frontend runner switching**: Works correctly for both `codex` and `claude`  
✅ **SSE event handling**: Both event formats handled in transcript parsing  
✅ **Docker build**: `docker compose build claude-runner` succeeds

See `v0.6.0_Claude_Agent_SDK_Design.md` for full specification.

---

## v0.5.1 — File Upload & Browser (Feb 6, 2026)

Release name: **file management**

### Highlights

- Upload local folders directly from browser to create workspaces
- Browse, view, and download workspace files
- RBAC model for multi-tenant file access
- Documented AWS/production DB migration recovery steps for `users.tenant_id` / missing `alembic_version` (see `Service_Guide.md` -> Migrations)

### Features

- **Local Folder Upload**
  - 📤 Upload button in Agents Tab workspace panel
  - Browser-side ZIP compression using JSZip (up to 1GB)
  - Automatic workspace registration after upload

- **File Browser & Download**
  - 📁 Files tab in Agents Tab Output panel
  - 📁 Files panel in Chat UI sidebar
  - Directory navigation with breadcrumbs
  - In-browser file viewing (text, code, markdown)
  - Single file download
  - Folder download as ZIP

- **Backend API Endpoints**
  - `GET /api/workspaces/{id}/files` - List directory contents
  - `GET /api/workspaces/{id}/files/view` - View file content
  - `GET /api/workspaces/{id}/files/download` - Download single file
  - `GET /api/workspaces/{id}/files/download-zip` - Download folder as ZIP
  - `POST /api/workspaces/{id}/files/upload` - Upload file to workspace
  - `POST /api/workspaces/upload` - Upload zipped folder as new workspace

- **RBAC Enhancements**
  - New tables: `tenants`, `groups`, `user_groups`, `workspace_access`
  - Multi-tenant model for NHS Trust organizations
  - Workspace ownership tracking (`owner_id`)

See `File_Management_Design.md` and `File_Management_Requirements.md` for current specs.

### Dependencies Added

- `jszip` (frontend) - Browser-side ZIP compression
- `python-multipart` (backend) - File upload support

---

## v0.4.0 — Authentication & RBAC (Jan 19, 2026)

Release name: **auth foundation**

### Highlights

- User authentication with JWT tokens
- Role-based access control (admin/user)
- Simplified Agents workflow

### Features

- Login/logout with email/password
- Protected routes requiring authentication
- Admin user management
- Workspace removal with confirmation
- Codex skip git trust check for local folders

---

## v0.3.0 — UI Tab Uplift (Jan 18, 2026)

Release name: **dashboard uplift**

### Highlights

- Dashboard, Projects, Settings tabs redesigned
- Dark mode support
- Renamed Codex to Agents

---

## v0.2.0 — Multi-Runner & Chat UI (Jan 2026)

Release name: **multi-runner**

### Highlights

- Support for multiple AI runners (Codex + Claude)
- Enterprise Chat UI with message persistence
- Workspace registry with local folder scan/import
- Real-time workspace sync

---

## v0.1.0 — Initial Demo

Release name: **initial demo**

### Highlights

- End-to-end demo workflow available through the web UI.
- Repository session creation by cloning a public Git URL.
- Prompt execution powered by `@openai/codex-sdk` (Codex CLI under the hood).
- Streaming events surfaced end-to-end via SSE (runner -> backend -> frontend).

### Features

- Frontend (Next.js)
  - SaaS-style app shell (sidebar + top nav) with placeholder pages.
  - `/codex` page to:
    - create a session from a repo URL
    - run a prompt
    - view a streaming event log
  - Next.js `/api/*` routes proxy requests to backend services.

- Backend (FastAPI)
  - `POST /api/sessions` clones the provided repository into `/workspaces/<session_id>/repo`.
  - `POST /api/sessions/{session_id}/prompt` starts a run in the runner.
  - `GET /api/runs/{run_id}/events` proxies the runner SSE stream.

- Runner (Node)
  - HTTP service that hosts Codex threads and runs.
  - Uses `@openai/codex-sdk` and streams structured events.

- Docker Compose
  - One-command startup for frontend/backend/runner/postgres.
  - Default ports:
    - frontend: 9100
    - backend: 9101
    - runner: 9102
    - postgres: 9103

### Configuration

- `.env` at repo root:
  - `CODEX_API_KEY=...`

### Notes / Known limitations

- Sessions and runs are stored in memory (no persistence across restarts).
- Repository access currently assumes public git URLs.
- The runner is configured for Docker execution using a Codex config that sets a permissive sandbox mode; production usage should add stricter isolation and governance controls.
