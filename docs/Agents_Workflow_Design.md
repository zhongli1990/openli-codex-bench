# v0.4.1 Agents Page Workflow Design

> **Status**: ✅ IMPLEMENTED
> **Target Release**: v0.4.1
> **Branch**: `main`
> **Related Documents**:
> - `v0.2.0_Service_Guide.md`
> - `v0.2.0_Status_and_Roadmap.md`

---

## 1. Overview

This document defines the complete lifecycle design for the Agents page workspace, session, and runner workflow. The goal is to provide a simplified, intuitive UX that eliminates confusion around session/runner management.

---

## 2. Data Model

```
Workspace (Project)
    │
    ├── workspace_id (UUID)
    ├── display_name
    ├── source_type (github | local)
    ├── source_uri
    ├── local_path
    └── created_at
         │
         └── Sessions (1:N)
                 │
                 ├── session_id (UUID)
                 ├── workspace_id (FK)
                 ├── runner_type (codex | claude)
                 ├── thread_id (runner-specific)
                 ├── created_at
                 └── run_count
                      │
                      └── Runs (1:N)
                              │
                              ├── run_id (UUID)
                              ├── session_id (FK)
                              ├── prompt
                              ├── status
                              └── events[]
```

### Key Constraints

1. **Session is tied to a runner** - Once created, a session's runner_type cannot change
2. **Thread context** - Each session has a thread_id that maintains conversation context with the runner
3. **Workspace isolation** - Sessions belong to a single workspace

---

## 3. Lifecycle States

### 3.1 Application State

| State Variable | Type | Description |
|----------------|------|-------------|
| `selectedWorkspaceId` | `string \| null` | Currently selected workspace |
| `sessionId` | `string \| null` | Currently active session |
| `runnerType` | `"codex" \| "claude"` | Selected runner for new sessions |
| `status` | `string` | Current operation status |

### 3.2 State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                        INITIAL STATE                            │
│  workspaceId: null, sessionId: null, runnerType: "codex"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ [Select Workspace]
┌─────────────────────────────────────────────────────────────────┐
│                     WORKSPACE SELECTED                          │
│  workspaceId: "xxx", sessionId: null, runnerType: "codex"      │
│  → Sessions list loads for this workspace                       │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼ [Create Session]                  ▼ [Click Existing Session]
┌───────────────────────────┐     ┌───────────────────────────────┐
│    SESSION CREATED        │     │    SESSION CONTINUED          │
│  sessionId: "new"         │     │  sessionId: "existing"        │
│  runnerType: (selected)   │     │  runnerType: (from session)   │
│  → Ready for prompts      │     │  → Runs history loads         │
└───────────────────────────┘     └───────────────────────────────┘
                              │
                              ▼ [Clear Session]
┌─────────────────────────────────────────────────────────────────┐
│                     SESSION CLEARED                             │
│  workspaceId: "xxx", sessionId: null, runnerType: (preserved)  │
│  → Can select different runner and create new session           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ [Change Runner]
┌─────────────────────────────────────────────────────────────────┐
│                     RUNNER CHANGED                              │
│  workspaceId: "xxx", sessionId: null, runnerType: (new)        │
│  → Session auto-cleared, ready to create with new runner        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. UI Design

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Agent Console                                                               │
│ Select a workspace, choose a runner, and run prompts with streaming output. │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│ WORKSPACE PANEL     │  │ PROMPT PANEL        │  │ OUTPUT PANEL            │
│                     │  │                     │  │                         │
│ [Workspace ▼] [🗑️]  │  │ Status: ready       │  │ Transcript / Raw Events │
│                     │  │                     │  │                         │
│ Sessions (3)        │  │ ┌─────────────────┐ │  │                         │
│ ┌─────────────────┐ │  │ │ Prompt textarea │ │  │                         │
│ │ codex • 5 runs  │ │  │ └─────────────────┘ │  │                         │
│ │ claude • 2 runs │ │  │                     │  │                         │
│ └─────────────────┘ │  │ [Run Prompt]        │  │                         │
│                     │  │                     │  │                         │
│ [Clear Session]     │  └─────────────────────┘  └─────────────────────────┘
│                     │
│ ─────────────────── │
│ Runner              │
│ [OpenAI Agent ▼]    │  ← Always enabled
│                     │
│ [Create Session]    │  ← Always visible
│                     │
│ Run History         │
│ ┌─────────────────┐ │
│ │ completed 10:30 │ │
│ │ completed 10:25 │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 4.2 Component Behaviors

#### Workspace Dropdown
- Always enabled
- Changing workspace clears session and loads new sessions list
- Shows workspace display name and source type

#### Remove Workspace Button (🗑️)
- Only visible when workspace is selected
- Shows confirmation dialog before deletion
- Deletes workspace and all associated sessions/runs
- Clears selection after deletion

#### Sessions List
- Shows all sessions for selected workspace
- Each session shows: runner_type, run_count, created_at
- Clicking a session sets it as active
- Active session highlighted with blue background

#### Clear Session Button
- Only visible when session is active
- Clears sessionId, events, runs, prompt
- Preserves workspace selection and runner selection

#### Runner Dropdown
- **ALWAYS ENABLED** (key change from v0.4.0)
- Changing runner auto-clears current session
- Shows current selection: "OpenAI Agent" or "Claude Agent"

#### Create Session Button
- **ALWAYS VISIBLE** (key change from v0.4.0)
- Disabled only when no workspace selected or creating
- Creates new session with selected runner
- Sets new session as active

#### Run History
- Only visible when session is active and has runs
- Clickable to load historical prompt/response

---

## 5. User Scenarios

### Scenario 1: First-time User
1. User opens Agents page → No workspace selected
2. User clicks "+ Import" or "🔍 Scan" to add workspace
3. User selects workspace from dropdown
4. User selects runner (default: OpenAI Agent)
5. User clicks "Create Session"
6. User enters prompt and clicks "Run Prompt"

### Scenario 2: Continue Existing Session
1. User selects workspace
2. User clicks existing session from sessions list
3. Runner dropdown updates to show session's runner (but stays enabled)
4. User enters prompt and runs

### Scenario 3: Switch Runner Mid-Work
1. User has active session with OpenAI Agent
2. User changes runner dropdown to Claude Agent
3. **Session auto-clears** (with visual feedback)
4. User clicks "Create Session" to start new Claude session

### Scenario 4: Clear Session Without Changing Runner
1. User has active session
2. User clicks "Clear Session"
3. Session clears, runner preserved
4. User can create new session with same runner

### Scenario 5: Remove Workspace
1. User selects workspace
2. User clicks 🗑️ button
3. Confirmation dialog: "Delete workspace 'project-name' and all sessions?"
4. User confirms → Workspace deleted
5. Selection cleared, user can select another workspace

### Scenario 6: Switch Workspace
1. User has active session in Workspace A
2. User selects Workspace B from dropdown
3. Session clears, Workspace B sessions load
4. User can continue existing session or create new one

---

## 6. API Endpoints

### Existing Endpoints (No Changes)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/workspaces` | GET | List all workspaces |
| `POST /api/workspaces/import` | POST | Import from GitHub |
| `POST /api/workspaces/import-local` | POST | Import local folder |
| `GET /api/workspaces/scan` | GET | Scan for local folders |
| `GET /api/workspaces/{id}/sessions` | GET | List sessions for workspace |
| `POST /api/sessions` | POST | Create new session |
| `POST /api/sessions/{id}/prompt` | POST | Run prompt |
| `GET /api/sessions/{id}/runs` | GET | List runs for session |
| `GET /api/runs/{id}/detail` | GET | Get run details |

### New Endpoint
| Endpoint | Method | Description |
|----------|--------|-------------|
| `DELETE /api/workspaces/{id}` | DELETE | Delete workspace and all sessions/runs |

---

## 7. Implementation Checklist

### Frontend Changes (`frontend/src/app/(app)/codex/page.tsx`)
- [x] Remove `disabled={!!sessionId}` from runner dropdown
- [x] Add `onChange` handler to runner that clears session
- [x] Always show "Create Session" button (remove conditional)
- [x] Add "Clear Session" button (visible when session active)
- [x] Add "Remove Workspace" button with confirmation
- [x] Update status messages for clarity

### Backend Changes (`backend/app/main.py`)
- [x] Add `DELETE /api/workspaces/{id}` endpoint
- [x] Cascade delete sessions and runs

### Frontend API Proxy
- [x] Add delete workspace proxy route

---

## 8. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Runner always selectable | Dropdown never disabled |
| Create Session always visible | Button visible when workspace selected |
| Clear Session works | Clears session, preserves workspace/runner |
| Remove Workspace works | Deletes with confirmation |
| Runner change clears session | Auto-clear with visual feedback |
| Workspace change clears session | Session cleared on workspace switch |

---

## 9. E2E Streaming & Session Persistence (v0.7.0)

### 9.1 Streaming Architecture

```
┌─────────────┐     POST /prompt      ┌──────────┐    POST /runs     ┌───────────────┐
│  Frontend    │ ──────────────────▶   │  Backend  │ ──────────────▶  │  Runner        │
│  (Next.js)  │                        │ (FastAPI) │                   │ (Codex/Claude) │
│             │     GET /events (SSE)  │           │  GET /events(SSE)│               │
│  EventSource│ ◀━━━━━━━━━━━━━━━━━━━━  │  httpx    │ ◀━━━━━━━━━━━━━━━│  LLM API       │
│             │   real-time events     │  proxy    │   real-time      │  streaming     │
└─────────────┘                        └──────────┘                   └───────────────┘
```

Both runners emit SSE events in real-time. The backend proxies them through to the frontend while persisting each event to the `run_events` table.

### 9.2 Codex Runner Streaming (`runner/`)

Uses `@openai/codex-sdk` with `thread.runStreamed(prompt)` which returns an `AsyncGenerator<ThreadEvent>`.

**Event lifecycle**: `item.started` → `item.updated` (0..N) → `item.completed`

| ThreadItem Type | Started | Updated | Completed |
|-----------------|---------|---------|-----------|
| `reasoning` | Shows thinking text | Text grows | Clears |
| `command_execution` | Shows command | Live stdout/stderr | Captures exit code |
| `file_change` | Shows files being edited | — | Captures add/delete/update status |
| `mcp_tool_call` | Shows tool + args | — | Captures result/error |
| `todo_list` | Shows plan checklist | Items update (✅/⬜) | Clears |
| `agent_message` | Shows text | Text grows | Captures final response |

### 9.3 Claude Runner Streaming (`claude-runner/`)

Uses `anthropic` SDK with `client.messages.stream()` for true token-by-token streaming.

| Event Type | UI Rendering |
|-----------|-------------|
| `ui.message.assistant.delta` | Appends `textDelta` to streaming text with blinking cursor |
| `ui.tool.call.start` | Shows amber tool box with spinner |
| `ui.tool.call` | Shows tool name + input |
| `ui.tool.result` | Captures result, clears tool indicator |
| `ui.message.assistant.final` | Clears streaming text (final captured for DB) |
| `ui.iteration` | Shows agent loop progress (current/max) |

### 9.4 Frontend Streaming UI Components

The Agent Console renders streaming state with three visual elements:

1. **Streaming text** — green pulsing dot + markdown rendered in real-time with blinking cursor
2. **Active tool call** — amber box with spinner showing tool name + input preview
3. **Thinking indicator** — bouncing robot emoji when waiting for first token

```
┌─────────────────────────────────────────────────────┐
│ 🟢 Assistant is responding...                        │
│                                                       │
│ I'll analyze the codebase structure first...          │
│ █ (blinking cursor)                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⟳ Running: shell                                     │
│   git log --oneline -5                               │
└─────────────────────────────────────────────────────┘
```

### 9.5 Session Persistence

Active runs survive user navigation through multiple mechanisms:

| Layer | Mechanism | Survives |
|-------|-----------|----------|
| **React state** | `AppContext` holds `codexRunId`, `codexStatus`, `codexEvents` | SPA navigation (clicking tabs) |
| **sessionStorage** | `codex-active-run` key stores active `runId` | Hard browser refresh |
| **Runner buffer** | In-memory event buffer with pub/sub replay | EventSource disconnect/reconnect |
| **Database** | `run_events` table persists all events | Runner restart (fallback) |

**Reconnect flow** when user returns to Agent Console:
1. Check `AppContext` for active `runId` with `status === "running"`
2. If no context, check `sessionStorage` for saved `runId`
3. Open new `EventSource` to `/api/runs/{runId}/events`
4. Runner replays all buffered events, then streams live events
5. If SSE fails, fall back to `GET /api/runs/{runId}/detail` for DB-persisted events

### 9.6 Implementation Files

| File | Role |
|------|------|
| `runner/src/server.ts` | Codex runner: `runStreamed()`, pub/sub buffer, SSE endpoint |
| `claude-runner/app/agent.py` | Claude runner: `messages.stream()`, SSE event generation |
| `claude-runner/app/main.py` | Claude runner: pub/sub buffer, SSE endpoint |
| `backend/app/main.py` | Backend: `httpx` SSE proxy, event persistence to DB |
| `frontend/src/app/(app)/codex/page.tsx` | Frontend: `EventSource`, event handling, streaming UI |
| `frontend/src/contexts/AppContext.tsx` | React state: `codexRunId`, `codexStatus`, `codexEvents` |

---

*Document Version: 2.0*
*Created: Jan 19, 2026*
*Updated: Feb 9, 2026 — Added streaming architecture and session persistence (v0.7.0)*
*Author: Cascade AI Assistant*
