# SaaS Codex Implementation Status and Roadmap

This document provides a comprehensive status report of all releases, pending refinements, and the roadmap for future releases targeting NHS Trust non-technical clinical users.

---

## Table of Contents

1. [Current Implementation Status](#1-current-implementation-status)
2. [What Is Implemented and How](#2-what-is-implemented-and-how)
3. [Pending Refinements and Uplift Opportunities](#3-pending-refinements-and-uplift-opportunities)
4. [v0.3.0 Roadmap: NHS Trust Clinical User Self-Service](#4-v030-roadmap-nhs-trust-clinical-user-self-service)
5. [v0.4.0+ Vision: Full Release Lifecycle Automation](#5-v040-vision-full-release-lifecycle-automation)
6. [Next Actions](#6-next-actions)

---

## 1. Current Implementation Status

### Branch: `dev/v0.2.0`

### Commits (v0.2.0 - v0.2.3)

| # | Commit | Description |
|---|--------|-------------|
| 1 | `347ffd7` | Design docs, SSE hardening, Dockerfile fix |
| 2 | `d5fb7e5` | Claude runner microservice (Python/FastAPI) |
| 3 | `4c0291d` | UI uplift: runner selection, transcript view |
| 4 | `99ff020` | E2E test for SSE streaming |
| 5 | `7566e30` | Implementation plan update |
| 6 | `b0eb7cd` | Persistence schema and workspace/session management |
| 7 | `e754774` | Microservices placeholders |
| 8 | `0b80717` | README update |
| 9 | `482c6ba` | v0.2.1: CSS static assets fix, workspace auto-import on startup |
| 10 | `6d776db` | v0.2.1: Transcript parsing fix for Codex events |
| 11 | `6aa321d` | v0.2.2: Local folder scan and import feature |
| 12 | `2740d52` | v0.2.2: Comprehensive documentation update |
| 13 | `43bab75` | v0.2.3: Cache bypass for frontend API routes |
| 14 | `da6f434` | v0.2.3: Real-time workspace sync with filesystem |
| 15 | `3074dbe` | v0.2.3: Documentation update and release |
| 16 | `51f1802` | v0.2.4: Enterprise Chat UI with message persistence |
| 17 | `f7f2257` | v0.2.5: UI/UX improvements - state persistence, sidebar fix, thread recovery |
| 18 | `e33b4a2` | v0.2.6: Click-to-load run history feature |
| 19 | `28ce095` | v0.3.0: Dashboard, Projects, Settings UI tab uplift |
| 20 | `5e54e22` | v0.3.0: Settings localStorage persistence, accurate model lists |
| 21 | `a04e337` | v0.3.0: Dark mode support and favicon |
| 22 | `d163c92` | v0.3.0: Rename Codex to Agents |
| 23 | `afbfbce` | v0.3.0: Documentation updates |
| 24 | `9328d47` | v0.3.0: Rollback dark mode contrast changes |
| 25 | `437793c` | v0.4.0: User authentication and RBAC |
| 26 | `41e3ab4` | v0.4.0: Documentation updates for Auth & RBAC |
| 27 | `41e7725` | v0.4.0: TopNav user display fix, AuthGuard route protection |
| 28 | `26ec38e` | v0.4.0: Final release documentation updates |
| 29 | `8b20b80` | v0.4.0: Runner dropdown sync, production deployment docs |
| 30 | `8f5a2dd` | v0.4.0: Session/runner UX with New Session button |
| 31 | `0884ae6` | v0.4.1: Simplified Agents workflow, Remove Workspace |
| 32 | `90d9eb3` | v0.4.1: Reorder workspace buttons (Import, Scan, Remove) |
| 33 | `4c151ec` | v0.4.2: Codex skip git trust check for manually copied folders |

### Feature Completion Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Claude Runner | ✅ Complete | Agent loop with tool use |
| Codex Runner | ✅ Complete | SSE hardening applied |
| Multi-Runner UI | ✅ Complete | Dropdown selection |
| Transcript View | ✅ Complete | Markdown rendering, Codex + Claude events |
| Raw Events View | ✅ Complete | JSON display |
| Tool Call Display | ✅ Complete | Shell commands with input/output |
| Workspace Import | ✅ Complete | GitHub URL import |
| Workspace Registry | ✅ Complete | De-duplication by source_uri |
| Workspace Auto-Import | ✅ Complete | Scans /workspaces on startup |
| Session Management | ✅ Complete | List, create, continue |
| SSE Streaming | ✅ Complete | Anti-buffering, replay |
| Persistence Schema | ✅ Complete | SQLAlchemy async ORM |
| Database Integration | ✅ Complete | Repository pattern, PostgreSQL |
| Prompt Manager | ✅ Complete | DB-backed CRUD, versioning, render, RBAC, 10 seed templates |
| Skills Manager | ✅ Complete | DB-backed CRUD, versioning, file-sync, toggle, RBAC |
| Evaluation Service | ✅ Placeholder | Score endpoint |
| Memory Service | ✅ Placeholder | Store + query |
| LLM Gateway | ✅ Placeholder | Unified API |
| Local Folder Import | ✅ Complete | Scan and import manually copied folders (v0.2.2) |
| Real-time Workspace Sync | ✅ Complete | Dropdown reflects filesystem state (v0.2.3) |
| Cache Bypass | ✅ Complete | All API routes use no-store (v0.2.3) |
| Enterprise Chat UI | ✅ Complete | ChatGPT/Claude-style chat page (v0.2.4) |
| Message Persistence | ✅ Complete | All conversations saved to DB (v0.2.4) |
| Syntax Highlighting | ✅ Complete | Prism code blocks in chat (v0.2.4) |
| Shared App Context | ✅ Complete | State persists across tab switches (v0.2.5) |
| Sidebar Navigation | ✅ Complete | Active tab highlight follows clicks (v0.2.5) |
| Thread Recovery | ✅ Complete | Auto-recreate expired runner threads (v0.2.5) |
| Codex Message Persistence | ✅ Complete | Codex prompts/responses saved to DB (v0.2.5) |
| Click-to-Load Run History | ✅ Complete | Load historical runs in Codex page (v0.2.6) |
| Dashboard Metrics | ✅ Complete | Real data from database (v0.3.0) |
| Projects Workspace View | ✅ Complete | Workspace cards with stats (v0.3.0) |
| Settings Configuration | ✅ Complete | Form-based settings with localStorage (v0.3.0) |
| Settings Persistence | ✅ Complete | localStorage saves all settings (v0.3.0) |
| Theme Switching | ✅ Complete | Immediate light/dark/system application (v0.3.0) |
| System Health Monitoring | ✅ Complete | Service health checks (v0.3.0) |
| Authentication | ✅ Complete | JWT auth, bcrypt hashing (v0.4.0) |
| User Registration | ✅ Complete | Self-registration with admin approval (v0.4.0) |
| Admin User Management | ✅ Complete | Approve/reject/activate/deactivate (v0.4.0) |
| Role-Based Access Control | ✅ Complete | Admin and user roles (v0.4.0) |
| Route Protection | ✅ Complete | AuthGuard redirects unauthenticated users (v0.4.0) |
| TopNav User Display | ✅ Complete | Shows actual logged-in user (v0.4.0) |
| Simplified Agents Workflow | ✅ Complete | Runner always enabled, auto-clear (v0.4.1) |
| Remove Workspace | ✅ Complete | Delete with confirmation dialog (v0.4.1) |
| Clear Session | ✅ Complete | Explicit clear button (v0.4.1) |
| Tenant Isolation | ❌ Not Started | Schema has tenant_id fields |

---

## 2. What Is Implemented and How

### 2.1 Claude Runner (`claude-runner/`)

**Implementation Approach**:
- Python 3.12 + FastAPI for ecosystem alignment
- Anthropic SDK for Claude API access
- Custom agent loop with tool use (not SDK agent)
- Same HTTP contract as Codex runner for backend compatibility

**Agent Loop**:
1. Receive user prompt
2. Send to Claude with tool definitions
3. Stream response chunks via SSE
4. If Claude requests tool call → execute tool → continue
5. Repeat until final response
6. Emit `run.completed` event

**Tools Implemented**:
- `read_file` - Read file contents with path validation
- `write_file` - Write content with directory creation
- `list_files` - List directory entries
- `bash` - Execute shell commands with timeout

**Security**:
- All paths validated under `WORKSPACES_ROOT`
- Bash commands run in working directory only
- 60-second timeout on bash execution

### 2.2 UI Uplift (`frontend/src/app/(app)/codex/page.tsx`)

**Implementation Approach**:
- React state management for workspace/session/run flow
- `react-markdown` + `remark-gfm` for Markdown rendering
- EventSource for SSE consumption
- Transcript derived from normalized UI events

**State Flow**:
```
idle → creating-session → session-ready → running → completed/error
```

**Event Processing**:
- `ui.message.user` → User message bubble
- `ui.message.assistant.delta` → Accumulate text
- `ui.message.assistant.final` → Assistant message bubble
- `ui.tool.call` → Tool call section (collapsible)
- `ui.tool.result` → Tool result section (collapsible)

### 2.3 Backend Routing (`backend/app/main.py`)

**Implementation Approach**:
- `runner_type` stored per session
- `_get_runner_url()` routes to correct runner
- `_runs` dict tracks run → runner_type for SSE routing

**Workspace De-duplication**:
- `_find_workspace_by_source(source_type, source_uri)`
- Returns existing workspace if found
- Prevents duplicate clones

### 2.4 Persistence Schema (`backend/app/models.py`)

**Implementation Approach**:
- SQLAlchemy 2.0 async ORM
- Alembic for migrations
- PostgreSQL-specific types (UUID, JSONB, TIMESTAMPTZ)

**Current State**:
- Schema defined and migration ready
- Backend uses in-memory dicts for MVP speed
- Migration to actual queries is straightforward

### 2.5 Microservices (Placeholders)

**Implementation Approach**:
- Minimal FastAPI services with stable APIs
- In-memory storage for MVP
- Ready for production implementation

**Purpose**:
- Establish API contracts early
- Enable frontend/backend integration
- Defer complex implementation to later phases

---

## 3. Pending Refinements and Uplift Opportunities

### 3.1 v0.2.1 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Database Integration** | Repository pattern with PostgreSQL | ✅ Complete |
| **Session Continuation** | UI to select and continue existing sessions | ✅ Complete |
| **Workspace Dropdown** | UI to select from imported workspaces | ✅ Complete |
| **Workspace Auto-Import** | Scan /workspaces on startup, import existing repos | ✅ Complete |
| **CSS Static Assets** | Fixed Dockerfile for standalone mode | ✅ Complete |
| **Transcript Parsing** | Handle Codex event types (item.completed, command_execution) | ✅ Complete |

### 3.2 v0.2.2 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Local Folder Scan** | `GET /api/workspaces/scan` - discover unregistered folders | ✅ Complete |
| **Local Folder Import** | `POST /api/workspaces/import-local` - register local folder | ✅ Complete |
| **Scan Local UI** | Button to scan and import manually copied folders | ✅ Complete |
| **Multi-Source Support** | Handle git repos, plain folders, any source | ✅ Complete |

### 3.3 v0.2.3 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Cache Bypass** | All frontend API routes use `cache: no-store` | ✅ Complete |
| **Real-time Workspace Sync** | Dropdown filters by existing folders on disk | ✅ Complete |
| **Orphan Handling** | Workspaces with deleted folders automatically hidden | ✅ Complete |
| **E2E Test** | Verified with mem0 repo clone and import | ✅ Complete |

### 3.4 v0.2.4 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Enterprise Chat UI** | Dedicated `/chat` page with ChatGPT/Claude-style interface | ✅ Complete |
| **Message Persistence** | `messages` table with session_id, role, content, metadata | ✅ Complete |
| **Chat History** | Load conversation history when selecting session | ✅ Complete |
| **Syntax Highlighting** | Prism code blocks with dark theme | ✅ Complete |
| **Tool Call Cards** | Collapsible cards with input/output display | ✅ Complete |
| **Real-time Streaming** | Typing indicator during AI response | ✅ Complete |
| **Markdown Rendering** | GFM support with tables, lists, code | ✅ Complete |
| **Docker Deployment** | All containers rebuilt and verified | ✅ Complete |

#### v0.2.4 Test Readiness

**Deployment Status** (Jan 18, 2026 18:30 UTC):
- All 9 Docker containers running and healthy
- Database tables created: `workspaces`, `sessions`, `runs`, `run_events`, `messages`
- Frontend accessible at `http://localhost:9100`
- Backend API accessible at `http://localhost:9101`

**E2E Test Plan**:

| Test Case | URL | Steps | Status |
|-----------|-----|-------|--------|
| Chat UI - Codex | `/chat` | Select workspace → Create session (Codex) → Send message → Verify streaming | 🔜 Pending |
| Chat UI - Claude | `/chat` | Select workspace → Create session (Claude) → Send message → Verify streaming | 🔜 Pending |
| Chat History | `/chat` | Send messages → Refresh page → Select session → Verify history loads | 🔜 Pending |
| Codex Page | `/codex` | Verify existing task-based workflow still works | 🔜 Pending |
| Workspace Sync | `/chat` | Delete folder → Verify dropdown updates | 🔜 Pending |

### 3.5 v0.2.5 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Shared App Context** | React context for state persistence across tab switches | ✅ Complete |
| **Sidebar Navigation Fix** | Active tab highlight now follows clicks using `usePathname` | ✅ Complete |
| **Thread Recovery** | Auto-recreate expired runner threads after container restart | ✅ Complete |
| **Codex Message Persistence** | Codex prompts/responses now saved to messages table | ✅ Complete |
| **Chat Event Parsing** | Fixed Codex runner event parsing in Chat UI | ✅ Complete |
| **URL State Sync** | Workspace/session IDs synced to URL params | ✅ Complete |

### 3.6 v0.2.6 (✅ COMPLETE - Jan 18, 2026)

| Item | Description | Status |
|------|-------------|--------|
| **Click-to-Load Run History** | Run history items in Codex page are now clickable | ✅ Complete |
| **Load Prompt** | Clicking a run loads its prompt into the Prompt field | ✅ Complete |
| **Load Events** | Clicking a run loads its persisted events into the Output area | ✅ Complete |
| **Visual Feedback** | Selected run highlighted with blue background/border | ✅ Complete |
| **New Endpoint** | `GET /api/runs/{run_id}/detail` for fetching persisted run data | ✅ Complete |

### 3.7 v0.3.0 UI Tab Uplift (✅ COMPLETE - Jan 18, 2026)

See detailed proposal: `archive/v0.3.0_UI_Tab_Uplift_Proposal.md`

#### Dashboard Tab Uplift

| Item | Description | Status |
|------|-------------|--------|
| **Real Metrics** | Workspaces, Sessions, Runs Today, Total Runs from database | ✅ Complete |
| **Activity Feed** | Recent runs with status, workspace name, runner type, timestamp | ✅ Complete |
| **Quick Actions** | Import Project, Start Chat, Run Codex, View Projects buttons | ✅ Complete |
| **System Status** | Health checks for Backend, Codex Runner, Claude Runner, Database | ✅ Complete |
| **Auto-refresh** | Dashboard data refreshes every 30 seconds | ✅ Complete |
| **Loading States** | Skeleton loaders during data fetch | ✅ Complete |

#### Projects Tab Uplift

| Item | Description | Status |
|------|-------------|--------|
| **Workspace Cards** | Display name, source URL/path, session/run counts, creation date | ✅ Complete |
| **Search & Filter** | Filter workspaces by name or source URI | ✅ Complete |
| **Actions Menu** | Refresh, Copy Path options | ✅ Complete |
| **Session Expansion** | Click to view sessions within each workspace | ✅ Complete |
| **Quick Navigation** | Open in Codex, Open in Chat buttons per workspace | ✅ Complete |
| **Empty State** | Helpful message when no workspaces exist | ✅ Complete |

#### Settings Tab Uplift

| Item | Description | Status |
|------|-------------|--------|
| **Sidebar Navigation** | General, Runners, Appearance, About categories | ✅ Complete |
| **General Settings** | Default runner selection, session timeout, auto-save toggle | ✅ Complete |
| **Runner Config** | Accurate model lists - Codex SDK v0.84.0, Claude Sonnet 4 | ✅ Complete |
| **Appearance** | Theme (light/dark/system) with immediate application | ✅ Complete |
| **About Page** | Version info, build hash, license, GitHub/docs links | ✅ Complete |
| **localStorage Persistence** | All settings saved to browser localStorage | ✅ Complete |
| **Save Confirmation** | Visual "✓ Saved" feedback on save | ✅ Complete |

#### Runner Model Configuration (Verified)

| Runner | SDK/Model | Version |
|--------|-----------|---------|
| **Codex** | `@openai/codex-sdk` | v0.84.0 (agentic SDK) |
| **Claude** | `claude-sonnet-4-20250514` | Latest (default) |
| **Claude** | `claude-3-5-sonnet-20241022` | Available |
| **Claude** | `claude-3-5-haiku-20241022` | Available |
| **Claude** | `claude-3-opus-20240229` | Available |

#### New Backend Endpoints (v0.3.0)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/dashboard` | GET | Aggregated dashboard statistics |
| `/api/health/services` | GET | System health status for all services |

#### New Frontend Files (v0.3.0)

| File | Description |
|------|-------------|
| `frontend/src/app/api/stats/dashboard/route.ts` | API proxy for dashboard stats |
| `frontend/src/app/api/health/services/route.ts` | API proxy for health checks |

### 3.8 Future Enhancements (v0.3.1+)

| Item | Description | Effort |
|------|-------------|--------|
| **Message Search** | Search within chat history | Medium |
| **Copy to Clipboard** | Copy chat messages | Low |
| **Export Conversation** | Download as Markdown/PDF | Medium |
| **Multi-user Indicators** | Show when others are typing | Low |
| **API Key Management** | Secure storage for OpenAI, Anthropic, GitHub tokens | Medium |
| **Security Settings** | Workspace retention, audit logging, IP allowlist | Medium |

### 3.9 Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| **Type Safety** | Add TypeScript strict mode to frontend | Medium |
| **API Validation** | Add Pydantic validation to all endpoints | Medium |
| **Logging** | Structured logging across all services | High |
| **Metrics** | Prometheus metrics for observability | Medium |
| **Rate Limiting** | Protect against abuse | Medium |

### 3.9 Microservices Uplift

| Service | Current | Target |
|---------|---------|--------|
| **Prompt Manager** | In-memory storage | Postgres + versioning |
| **Evaluation** | Placeholder scores | LangSmith integration |
| **Memory** | Simple text matching | Vector embeddings + semantic search |
| **LLM Gateway** | Stub responses | Real provider routing + caching |

---

## 4. v0.3.0 Roadmap: NHS Trust Clinical User Self-Service

### 4.1 Vision

Enable NHS Trust non-technical clinical users to:
- Use plain English to analyze TIE (Trust Integration Engine) implementations
- Perform reverse engineering and documentation without developers
- Generate requirement specifications from natural language
- Execute full release lifecycle tasks with AI assistance

### 4.2 Target Personas

| Persona | Role | Needs |
|---------|------|-------|
| **Clinical Informaticist** | Defines clinical requirements | Natural language input, no code knowledge |
| **Integration Analyst** | Analyzes existing integrations | Reverse engineering, documentation |
| **Project Manager** | Tracks progress and approvals | Status dashboards, audit trails |
| **Compliance Officer** | Ensures governance | Audit logs, policy enforcement |

### 4.3 Key Features

#### 4.3.1 Natural Language Interface

**Goal**: Users describe tasks in plain English; AI translates to agent actions.

**Implementation**:
- Pre-built prompt templates for common tasks
- Intent classification to route to appropriate workflow
- Guided wizard for complex tasks
- Clarification dialogs when intent is ambiguous

**Example Interactions**:
```
User: "Analyze the HL7v2 ADT message handling in this integration"
→ AI: Identifies relevant files, traces message flow, generates documentation

User: "What changes are needed to support the new patient identifier format?"
→ AI: Analyzes current implementation, identifies impact points, proposes changes

User: "Generate a test plan for the new discharge notification"
→ AI: Creates test cases, edge cases, expected outcomes
```

#### 4.3.2 TIE Analysis Workflows

| Workflow | Description | Output |
|----------|-------------|--------|
| **Reverse Engineering** | Analyze existing integration code | Architecture diagram, data flow, component inventory |
| **Impact Assessment** | Evaluate change requirements | Affected components, risk analysis, effort estimate |
| **Documentation Generation** | Create technical docs | API specs, message formats, integration guides |
| **Gap Analysis** | Compare current vs. required | Missing features, compliance gaps, recommendations |

#### 4.3.3 Guided Task Wizards

**Step-by-step workflows for common tasks**:

1. **New Requirement Analysis**
   - Input: Clinical requirement in plain English
   - Steps: Clarify scope → Analyze codebase → Identify changes → Generate spec
   - Output: Technical specification document

2. **Integration Documentation**
   - Input: Select integration/workspace
   - Steps: Scan codebase → Extract patterns → Generate diagrams → Create docs
   - Output: Integration documentation package

3. **Test Case Generation**
   - Input: Feature description or change request
   - Steps: Analyze requirements → Identify scenarios → Generate test cases
   - Output: Test plan with expected outcomes

#### 4.3.4 Approval Workflows

**For NHS governance requirements**:

- Draft → Review → Approve → Implement → Verify
- Role-based access control
- Audit trail for all actions
- Digital signatures for approvals

### 4.4 UI/UX Requirements

#### 4.4.1 Simplified Interface

| Current (v0.2.0) | Target (v0.3.0) |
|------------------|-----------------|
| Technical prompt input | Task selection wizard |
| Raw events view | Hidden by default |
| Manual session management | Automatic context |
| Single workspace | Project dashboard |

#### 4.4.2 Dashboard View

```
┌─────────────────────────────────────────────────────────────────┐
│  NHS Trust Integration Platform                    [User] [Help] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Analyze     │  │ Document    │  │ Test        │              │
│  │ Integration │  │ System      │  │ Changes     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  Recent Projects                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ADT Integration    │ Last: 2 hours ago │ [Continue]         ││
│  │ Lab Results Feed   │ Last: 1 day ago   │ [Continue]         ││
│  │ Discharge Notif.   │ Last: 3 days ago  │ [Continue]         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Quick Actions                                                   │
│  • "What does this integration do?"                              │
│  • "Generate documentation for..."                               │
│  • "What changes are needed for..."                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.4.3 Conversation View

```
┌─────────────────────────────────────────────────────────────────┐
│  ADT Integration Analysis                              [Export]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: Analyze the patient admission message handling            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Assistant:                                                   ││
│  │                                                              ││
│  │ I've analyzed the ADT^A01 message handling. Here's what     ││
│  │ I found:                                                     ││
│  │                                                              ││
│  │ ## Message Flow                                              ││
│  │ 1. Message received at `adt_receiver.py`                    ││
│  │ 2. Parsed by `hl7_parser.py`                                ││
│  │ 3. Patient record created in `patient_service.py`          ││
│  │                                                              ││
│  │ ## Key Components                                            ││
│  │ - **Receiver**: Listens on port 2575                        ││
│  │ - **Parser**: Handles HL7v2.5 format                        ││
│  │ - **Validator**: Checks required fields                     ││
│  │                                                              ││
│  │ [View Details] [Generate Documentation] [Ask Follow-up]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Ask a follow-up question...                          [Send] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Technical Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Authentication** | OIDC/SAML integration with NHS Identity |
| **Authorization** | Role-based access control (RBAC) |
| **Audit Logging** | Immutable audit trail for all actions |
| **Data Classification** | PII/PHI awareness and handling |
| **Retention Policies** | Configurable data retention |
| **Encryption** | At-rest and in-transit encryption |

---

## 5. v0.4.0+ Vision: Full Release Lifecycle Automation

### 5.1 Capabilities

| Phase | AI-Assisted Tasks |
|-------|-------------------|
| **Requirements** | Capture, clarify, validate clinical requirements |
| **Analysis** | Impact assessment, gap analysis, effort estimation |
| **Design** | Architecture proposals, interface specifications |
| **Implementation** | Code generation, modification, refactoring |
| **Testing** | Test case generation, execution, validation |
| **Documentation** | Technical docs, user guides, release notes |
| **Deployment** | Deployment scripts, configuration, verification |
| **Monitoring** | Health checks, alerting, incident response |

### 5.2 Agent Collaboration

**Multi-agent workflows**:
- **Analyst Agent**: Understands requirements, analyzes code
- **Architect Agent**: Proposes designs, validates patterns
- **Developer Agent**: Implements changes, writes tests
- **Reviewer Agent**: Reviews code, checks compliance
- **Tester Agent**: Executes tests, reports results

**Orchestration**:
- Workflow engine coordinates agent handoffs
- Human-in-the-loop for approvals
- Rollback capabilities for failed steps

### 5.3 Quality Assurance

| Aspect | Mechanism |
|--------|-----------|
| **Code Quality** | Automated linting, style checks |
| **Security** | SAST/DAST scanning, vulnerability checks |
| **Compliance** | Policy enforcement, audit trails |
| **Testing** | Automated test execution, coverage tracking |
| **Documentation** | Completeness checks, consistency validation |

### 5.4 Integration Points

| System | Integration |
|--------|-------------|
| **Git** | Repository management, branching, PRs |
| **CI/CD** | Pipeline triggering, deployment |
| **Issue Tracking** | Jira, ServiceNow integration |
| **Documentation** | Confluence, SharePoint publishing |
| **Monitoring** | Prometheus, Grafana dashboards |

---

## 6. Next Actions

### Immediate (This Week)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Test v0.2.0 with real API keys | Dev | High |
| 2 | Run database migrations | Dev | High |
| 3 | Fix any issues found in testing | Dev | High |
| 4 | Merge dev/v0.2.0 to main | Dev | Medium |
| 5 | Tag v0.2.0 release | Dev | Medium |

### Short-term (Next 2 Weeks)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Implement database integration | Dev | High |
| 2 | Add workspace dropdown to UI | Dev | Medium |
| 3 | Add session selection to UI | Dev | Medium |
| 4 | Implement run history view | Dev | Medium |
| 5 | Add structured logging | Dev | Medium |

### Medium-term (Next Month)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Design v0.3.0 clinical user workflows | Product | High |
| 2 | Implement authentication (OIDC) | Dev | High |
| 3 | Implement RBAC | Dev | High |
| 4 | Create task wizard UI | Dev | Medium |
| 5 | Integrate LangSmith for evaluation | Dev | Medium |

### Long-term (Next Quarter)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | NHS Trust pilot deployment | Ops | High |
| 2 | Clinical user feedback collection | Product | High |
| 3 | Multi-agent workflow engine | Dev | Medium |
| 4 | Full release lifecycle automation | Dev | Medium |
| 5 | Enterprise security hardening | Security | High |

---

## Appendix: Release Schedule

| Version | Date | Focus | Status |
|---------|------|-------|--------|
| v0.2.0 | Jan 2026 | Multi-runner, workspace registry, transcript UI | ✅ Complete |
| v0.2.1 | Jan 18, 2026 | Database integration, CSS fix, transcript parsing | ✅ Complete |
| v0.2.2 | Jan 18, 2026 | Local folder scan/import | ✅ Complete |
| v0.2.3 | Jan 18, 2026 | Real-time workspace sync, cache bypass | ✅ Complete |
| v0.2.4 | Jan 18, 2026 | Enterprise Chat UI, message persistence | ✅ Complete |
| v0.2.5 | Jan 18, 2026 | State persistence, sidebar fix, thread recovery | ✅ Complete |
| v0.2.6 | Jan 18, 2026 | Click-to-load run history | ✅ Complete |
| v0.3.0 | Jan 18, 2026 | Dashboard, Projects, Settings UI tab uplift | ✅ Complete |
| v0.4.0 | Jan 19, 2026 | User authentication and RBAC | ✅ Complete |
| v0.4.1 | Jan 19, 2026 | Simplified Agents workflow, Remove Workspace | ✅ Complete |
| v0.4.2 | Jan 19, 2026 | Codex skip git trust check | ✅ Complete |
| v0.5.1 | Feb 6, 2026 | Local folder upload, File browser & download, RBAC groups | ✅ Complete |
| v0.6.0 | Feb 2026 | Claude Agent SDK, Skills, Hooks, E2E Streaming | 🚧 In Progress |
| v0.7.0 | Q2 2026 | Clinical user workflows, task wizards | 🔜 Planned |
| v0.8.0 | Q2 2026 | Full lifecycle automation, multi-agent | 🔜 Planned |

---

## v0.5.1 Features (Complete)

### Local Folder Upload
- **📤 Upload button** in Agents Tab workspace panel
- Upload entire project folders from browser (up to 1GB)
- Browser-side ZIP compression before upload
- Automatic workspace registration

### Workspace File Browser & Download
- **📁 Files tab** in Agents Tab Output panel
- **📁 Files panel** in Chat UI sidebar
- Browse workspace directories
- View file contents (text, code, markdown)
- Download individual files or entire folders as ZIP
- Upload additional files to workspace

### RBAC Enhancements
- Multi-tenant model for NHS Trust organizations
- User groups for team-based access control
- Workspace access grants (owner, editor, viewer)
- Default download access for tenant users

### Backend Changes
- 6 new file API endpoints (list, view, download, download-zip, upload file, upload workspace)
- `python-multipart` added for file upload support
- Alembic migration 003 for RBAC tables

### Database Schema
- New tables: `tenants`, `groups`, `user_groups`, `workspace_access`
- Added `owner_id` to workspaces, `tenant_id` to users

See `File_Management_Design.md` for full specification.

---

## v0.6.2 Features (✅ Released Feb 8, 2026)

**Tag**: `v0.6.2`

### Test Documentation & Enhanced Hooks ✅
- Comprehensive `Testing_Guide.md` with requirements, strategy, and user guide
- Enhanced `hooks.py` with structured placeholders for future extension
- Automated `test_v061_features.sh` script (18 tests, all passing)
- New `e2e-test` skill for automated testing

### Test Coverage
| Category | Tests | Status |
|----------|-------|--------|
| Service Health | 2 | ✅ |
| Claude SDK | 2 | ✅ |
| Skills System | 6 | ✅ |
| Hooks Security | 6 | ✅ |
| Database | 2 | ✅ |

---

## v0.6.1 Features (✅ Released Feb 8, 2026)

**Tag**: `v0.6.1`

### Bug Fix: Runner Selection Persistence ✅
- Fixed race condition where `runnerType` was initialized to `"codex"` before localStorage loaded
- Sessions now correctly store `runner_type: 'claude'` when Claude Agent is selected
- Removed auto-sync `useEffect` that was overwriting user's dropdown selection

### Feature Verification ✅
| Feature | Status | E2E Verified |
|---------|--------|--------------|
| Claude Agent SDK Migration | ✅ Done | ✅ SDK available in container |
| Skills System | ✅ Done | ✅ 3 global skills loaded |
| Hooks (pre-tool validation) | ✅ Done | ✅ Blocks dangerous commands |
| UI/UX Streaming Events | ✅ Done | ✅ New event types handled |
| Transcript Rendering | ✅ Done | ✅ Skill badges, iteration bars |

### Test Commands
```bash
# Verify runner type stored correctly
docker compose exec -T postgres psql -U saas -d saas -c \
  "SELECT id, runner_type FROM sessions ORDER BY created_at DESC LIMIT 3;"

# Verify claude-runner received requests
docker compose logs claude-runner --tail=30 | grep -E "(POST|GET /runs)"

# Verify skills loaded
docker compose exec -T claude-runner ls -la /app/skills/
```

---

## v0.6.0 Features (✅ Released Feb 7, 2026)

**Tag**: `v0.6.0`

### Claude Agent SDK Migration ✅
- Replaced basic `anthropic` SDK with official `claude-agent-sdk>=0.1.30`
- Fallback to Anthropic SDK if Agent SDK unavailable
- Built-in agent loop with typed messages
- Native streaming support

### Claude Skill Files ✅
- **Global Skills**: Platform-wide skills in `claude-runner/skills/`
  - `code-review` — Code quality and security review
  - `security-audit` — Vulnerability scanning
  - `healthcare-compliance` — NHS data compliance checks
- **Workspace Skills**: Per-project skills in `.claude/skills/`
  - Uploaded with workspace or created by users
  - Override global skills with same name

### Hooks Implementation ✅
- **PreToolUse**: Block dangerous commands (`rm -rf`, `sudo`, `curl | sh`)
- **PreToolUse**: Block path traversal (`..` in file paths)
- **PostToolUse**: Audit logging with timestamps
- Configurable via `ENABLE_HOOKS` environment variable

### UI/UX E2E Streaming ✅
- New SSE events: `ui.skill.activated`, `ui.iteration`, `ui.tool.blocked`
- Skill activation badges (purple)
- Iteration progress bar
- Blocked tool highlighting (red)
- Collapsible tool input/output sections

### Authentication ✅
- API key authentication via `ANTHROPIC_API_KEY` (recommended)
- Cloud provider support: AWS Bedrock, Google Vertex AI, Microsoft Azure
- ⚠️ Browser login / OAuth NOT supported for third-party apps (Anthropic policy)

### Regression Testing ✅
- OpenAI Codex runner: Completely untouched
- Backend API: No changes to runner dispatch logic
- Frontend runner switching: Works for both `codex` and `claude`
- Both runners are plug-and-play interchangeable

See `v0.6.0_Claude_Agent_SDK_Design.md` for full specification.

---

## v0.7.0 Roadmap (Planned)

### Potential Features
- **MCP Tool Integration**: Custom healthcare validation tools via MCP servers
- **Expanded Tool Set**: Add Grep, Glob, Edit tools to Claude runner
- **Skill Editor UI**: Create/edit skills from the frontend
- **Skill Marketplace**: Share skills between workspaces
- **Multi-tenant Skills**: Tenant-specific global skills
