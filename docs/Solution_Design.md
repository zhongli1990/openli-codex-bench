# Solution / Implementation Design (saas-codex)

## 1. Architecture summary

This repository is a small monorepo deployed via Docker Compose:

- `frontend/` (Next.js App Router)
  - Presents the SaaS dashboard UI.
  - Proxies browser requests through Next.js API routes (`/api/*`).

- `backend/` (FastAPI)
  - Owns session lifecycle:
    - clones repositories
    - stores in-memory session mapping (MVP)
  - Proxies prompt/run operations to the runner.
  - Proxies runner event stream to the browser via SSE.

- `runner/` (Node + `@openai/codex-sdk`)
  - Hosts HTTP endpoints that:
    - create Codex threads bound to a workspace directory
    - start streamed runs
    - serve SSE event streams to subscribers
  - Uses the **Codex CLI** under the hood.

- `postgres` (Postgres 16)
  - Present for future persistence needs.
  - Not used heavily in the MVP code paths yet.

## 2. Runtime topology (docker-compose)

Default host ports:
- Frontend: `http://localhost:9100`
- Backend: `http://localhost:9101`
- Runner (Codex): `http://localhost:9102`
- Postgres: `localhost:9103`
- Claude Runner: `http://localhost:9104`
- Prompt Manager: `http://localhost:9105`
- Evaluation: `http://localhost:9106`
- Memory: `http://localhost:9107`
- LLM Gateway: `http://localhost:9108`

Container internal URLs:
- Frontend calls backend via `BACKEND_URL=http://backend:8080`.
- Backend calls Codex runner via `RUNNER_CODEX_URL=http://runner:8081`.
- Backend calls Claude runner via `RUNNER_CLAUDE_URL=http://claude-runner:8082`.
- Frontend proxies prompt-manager via `/api/prompt-manager/` → `http://prompt-manager:8083`.

## 3. Data flow

### 3.1 Create session
1. UI calls `POST /api/sessions` (Next.js route)
2. Next.js proxies to backend `POST /api/sessions`
3. Backend:
   - creates `session_id`
   - clones git repo into `/workspaces/<session_id>/repo`
   - calls runner `POST /threads` with `workingDirectory=/workspaces/<session_id>/repo`
4. Backend returns `{ session_id, repo_path, thread_id }` to UI

### 3.2 Run prompt
1. UI calls `POST /api/sessions/{session_id}/prompt`
2. Backend forwards to runner `POST /runs` with `{ threadId, prompt }`
3. Runner:
   - starts `thread.runStreamed(prompt)`
   - publishes events to an in-memory run buffer (so late subscribers can replay)
   - wraps the streamed events with lifecycle markers:
     - `{ "type": "run.started", ... }` at the beginning
     - `{ "type": "run.completed", ... }` on success
     - `{ "type": "error", ... }` on failure
4. Backend returns `{ run_id }`

### 3.3 Stream events (SSE)
1. UI opens `GET /api/runs/{run_id}/events` with `EventSource`
2. Next.js proxies to backend `GET /api/runs/{run_id}/events`
3. Backend streams bytes from runner `GET /runs/{run_id}/events` via `httpx.AsyncClient.stream()`

Notes:
- The runner replays any buffered SSE lines to new subscribers before streaming live events.
- If a run is already finished, the runner ends the SSE stream after sending a final `{ "type": "stream.closed", ... }` event.
- Backend persists each SSE event to the `run_events` table as it passes through.

### 3.4 Streaming event types by runner

Both runners emit real-time SSE events through the same pipeline. The frontend handles both event schemas.

**Codex runner** (`runner/`, `@openai/codex-sdk`):

```
thread.runStreamed(prompt) → AsyncGenerator<ThreadEvent>
```

| Event | Payload | Description |
|-------|---------|-------------|
| `item.started` | `{ item: ThreadItem }` | Item begins (reasoning, command, file_change, mcp_tool_call, todo_list) |
| `item.updated` | `{ item: ThreadItem }` | Item progress (live stdout, growing text) |
| `item.completed` | `{ item: ThreadItem }` | Item finished (final text, exit code, status) |
| `turn.started` | — | New model turn begins |
| `turn.completed` | `{ usage }` | Turn finished with token usage |
| `run.completed` | `{ runId, threadId }` | Wrapper event added by runner |

ThreadItem types: `agent_message`, `reasoning`, `command_execution`, `file_change`, `mcp_tool_call`, `web_search`, `todo_list`, `error`

**Claude runner** (`claude-runner/`, `anthropic` SDK):

```
client.messages.stream() → content_block_start/delta/stop events
```

| Event | Payload | Description |
|-------|---------|-------------|
| `ui.message.assistant.delta` | `{ textDelta }` | Token-by-token text streaming |
| `ui.message.assistant.final` | `{ text, format }` | Complete text block |
| `ui.tool.call.start` | `{ toolId, toolName }` | Tool call begins |
| `ui.tool.call` | `{ toolId, toolName, input }` | Tool call with full input |
| `ui.tool.result` | `{ toolId, toolName, output }` | Tool execution result |
| `ui.tool.blocked` | `{ toolId, reason }` | Tool blocked by hook |
| `ui.iteration` | `{ current, max }` | Agent loop iteration |
| `run.completed` | `{ threadId }` | Run finished |

### 3.5 Session persistence and SSE reconnect

The frontend maintains session state across navigation:

1. **SPA navigation**: `AppContext` preserves `runId`, `sessionId`, `codexStatus`, and `codexEvents` in React state
2. **Hard refresh**: Active `runId` persisted to `sessionStorage`; on mount, recovered and reconnected to live SSE stream
3. **SSE reconnect**: Both runners buffer all events in memory; reconnecting replays the full buffer then streams live events
4. **DB fallback**: If SSE reconnect fails (runner restarted), events are loaded from `run_events` table via `GET /api/runs/{id}/detail`

## 4. Key implementation details

### 4.1 Workspace safety
- Backend ensures workspace path is under `WORKSPACES_ROOT`.
- Runner also validates `workingDirectory` under `WORKSPACES_ROOT`.

### 4.2 Codex CLI requirements in containers
- `@openai/codex-sdk` spawns the Codex CLI binary.
- The runner image installs:
  - `ca-certificates` for TLS
  - `@openai/codex` globally
  - `/root/.codex/config.toml` to configure sandbox behavior

### 4.3 Sandbox behavior in Docker
- Codex uses Landlock/seccomp sandboxing on Linux.
- In containerized environments this sandbox may fail.
- The runner uses a Codex config file (`runner/codex-config.toml`) with:
  - `sandbox_mode = "danger-full-access"`
  - `approval_policy = "never"`

This relies on Docker as the isolation boundary.

### 4.4 State management (MVP)
- Backend stores sessions in memory (`_sessions` dict).
- Runner stores:
  - `threads` in memory
  - `runs` in memory (including buffered SSE lines for replay)

Production design will require persistence and cleanup.

## 5. API contracts

Backend (public within compose):
- `GET /health`
- `POST /api/sessions { repo_url }`
- `POST /api/sessions/{session_id}/prompt { prompt }`
- `GET /api/runs/{run_id}/events` (SSE)

Runner (internal within compose):
- `GET /health`
- `POST /threads { workingDirectory, skipGitRepoCheck }`
- `POST /runs { threadId, prompt }`
- `GET /runs/{runId}/events` (SSE)

Frontend API routes:
- `POST /api/sessions`
- `POST /api/sessions/[sessionId]/prompt`
- `GET /api/runs/[runId]/events`

## 6. Security considerations

- Secrets
  - `CODEX_API_KEY` must be provided via `.env` and must never be committed.
- Git
  - `workspaces/` should not be committed.
- Sandbox
  - Using `danger-full-access` increases the importance of Docker isolation and least-privilege container configuration.

## 7. Future evolution

- Persist sessions/runs in Postgres. ✅ (v0.2.0)
- Add private repo access via GitHub App / deploy keys.
- Add tenant context + auth. ✅ (v0.4.0)
- Add diff visualization and patch apply workflow.
- Local folder upload from browser. ✅ (v0.5.0)
- Workspace file browser & download. ✅ (v0.5.0)
- Multi-tenant RBAC with 5-role hierarchy. ✅ (v0.7.0)
- E2E streaming with Codex SDK + Claude SDK. ✅ (v0.7.0)
- Session persistence across navigation. ✅ (v0.7.0)
- Prompt & Skills Manager microservice. ✅ (v0.6.9)
- Workspace-level access grants via `workspace_access` table.
- Group-based permissions via `user_groups` membership.
- Audit logging for RBAC-sensitive operations.
- Tenant management UI (create/edit/delete tenants).


## 8. v0.2.0 planned changes

Planned scope for the next release is documented in:
- `archive/Product_Requirements_v0.2.0_Archive.md`
- `archive/v0.2.0_Implementation_Plan_Archive.md`

### 8.1 Multi-runner routing

Add a second runner type in addition to the current Codex runner:
- `codex` (existing): Node + `@openai/codex-sdk`
- `claude` (planned): Claude Agent SDK runner service

Backend will select a runner URL based on session runner type (example):
- `RUNNER_CODEX_URL=http://runner:8081`
- `RUNNER_CLAUDE_URL=http://claude-runner:8082`

The runner API contract remains consistent:
- `POST /threads`
- `POST /runs`
- `GET /runs/{runId}/events` (SSE)

### 8.2 Workspace registry and import

Move from clone-per-session to an explicit workspace registry:
- Backend provides endpoints to import and list workspaces.
- Sessions reference `workspace_id` (and a runner type), rather than always cloning.

### 8.3 Transcript UX + raw event persistence

Add persisted run history and lossless raw event storage.
- Store raw SSE events as received from runners.
- Derive a human-readable transcript for the UI (Markdown rendering).

### 8.4 Initial microservices

Introduce working placeholder services for:
- Prompt Manager
- Evaluation
- Memory
- LLM Gateway
