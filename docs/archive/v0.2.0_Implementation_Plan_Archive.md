# v0.2.0 Implementation Plan (Design-Complete)

This document describes **how v0.2.0 will be implemented** (architecture, APIs, schemas, data model, and rollout plan) before any feature coding begins.

Related docs:
- `docs/Product_Requirements_v0.2.0.md` (what we are building)
- `docs/Solution_Design.md` (current MVP architecture + v0.2.0 planned changes)
- `docs/Frontend_UI_Plan.md` (UI uplift details)

---

## 1. Executive summary

v0.2.0 converts the current MVP into an enterprise-shaped foundation by adding:

- **Two agent runners** (Codex + Claude Code Agent) with a unified contract
- **Workspace import + registry** (GitHub URL + local path now; Drive/SharePoint designed as a later connector phase)
- **Session management** (list, create, continue sessions per workspace)
- **Transcript-first UI** (Markdown) while preserving **lossless raw runner events** for audit/debug
- **SSE streaming reliability** (anti-buffering headers, flush behavior, reconnect tolerance)
- **Initial working microservices**:
  - Prompt Manager
  - Evaluation (LangSmith-forward design)
  - Memory (short-term + long-term)
  - LLM Gateway (LLMLite-like routing + usage logging)

Enterprise/NHS readiness is handled as baseline design requirements:

- auditability (immutable raw logs)
- data handling (PII/PHI aware)
- governance controls (policy boundaries; no secrets in code)
- isolation boundaries clearly stated (Docker sandboxing today)
- concurrency safety (session-scoped working directories)

---

## 2. Architectural principles

- **Single source of truth for logs**: store raw prompts and raw runner events as received.
- **Human UX is derived**: UI transcript is derived from raw events via a deterministic mapping.
- **Stable contracts**: backend speaks to runners and microservices via versioned HTTP APIs.
- **Least privilege**: workspaces constrained to `WORKSPACES_ROOT`, runners cannot escape.
- **Additive evolution**: v0.2.0 must not break the existing `/codex` workflow. New capabilities (workspaces, sessions list, runner routing, Claude runner) are added behind new endpoints or additive request fields.
- **SSE reliability**: all SSE endpoints must use anti-buffering headers, flush early, and support late-subscriber replay.
- **Phased connectors**: Google Drive/SharePoint require auth/connectors and are designed but not implemented in v0.2.0.

---

## 3. Target runtime topology (docker-compose)

### 3.1 Services (planned)

Existing:
- `frontend` (Next.js)
- `backend` (FastAPI)
- `runner` (Codex runner, Node)
- `postgres`

New for v0.2.0:
- `claude-runner` (Claude runner, Python)
- `prompt-manager` (FastAPI)
- `evaluation` (FastAPI)
- `memory` (FastAPI)
- `llm-gateway` (FastAPI or Node; initial implementation chooses FastAPI for consistency)

### 3.2 Ports (proposal)

Current:
- frontend: `9100 -> 3000`
- backend: `9101 -> 8080`
- codex runner: `9102 -> 8081`
- postgres: `9103 -> 5432`

Planned additions:
- claude-runner: `9104 -> 8082`
- prompt-manager: `9105 -> 8083`
- evaluation: `9106 -> 8084`
- memory: `9107 -> 8085`
- llm-gateway: `9108 -> 8086`

### 3.3 Environment variables (proposal)

Repo root `.env` (do not commit):
- `CODEX_API_KEY=...`
- `ANTHROPIC_API_KEY=...`
- `DATABASE_URL=postgresql+psycopg://...`

Backend:
- `WORKSPACES_ROOT=/workspaces`
- `RUNNER_CODEX_URL=http://runner:8081`
- `RUNNER_CLAUDE_URL=http://claude-runner:8082`
- `PROMPT_MANAGER_URL=http://prompt-manager:8083`
- `EVALUATION_URL=http://evaluation:8084`
- `MEMORY_URL=http://memory:8085`
- `LLM_GATEWAY_URL=http://llm-gateway:8086`

Evaluation:
- `LANGSMITH_API_KEY=...` (optional in v0.2.0; feature-flag)
- `LANGSMITH_PROJECT=saas-codex` (optional)

### 3.4 Health checks

Each service exposes:
- `GET /health -> {"status":"ok"}`

---

## 4. Persistence data model (Postgres)

The v0.2.0 persistence model focuses on **workspaces, sessions, runs, raw events**, and a derived transcript.

### 4.1 Tables

#### `workspaces`
- `id` (UUID, PK)
- `tenant_id` (UUID, nullable)
- `source_type` (TEXT, required)  
  Values: `github`, `local`, later: `gdrive`, `sharepoint`
- `source_uri` (TEXT, required)  
  Example: github URL or local path string as provided.
- `storage_mode` (TEXT, required)
  Values: `managed_copy` (default), later: `attached`
- `display_name` (TEXT, required)
- `local_path` (TEXT, required)  
  Must be under `WORKSPACES_ROOT`.
- `created_at` (TIMESTAMPTZ, required)
- `last_accessed_at` (TIMESTAMPTZ, nullable)
- `metadata_json` (JSONB, nullable)  
  Example: parsed repo owner/name, detected git remote, etc.

Indexes:
- `workspaces(source_type, source_uri)` unique (optional; prevents duplicates)

#### `sessions`
- `id` (UUID, PK)
- `tenant_id` (UUID, nullable)
- `workspace_id` (UUID, FK -> workspaces.id)
- `runner_type` (TEXT, required) values: `codex`, `claude`
- `runner_thread_id` (TEXT, required) thread identifier returned by runner
- `working_directory` (TEXT, required)
  Session-scoped path under `WORKSPACES_ROOT` used by the runner. This is the primary concurrency boundary.
- `created_at` (TIMESTAMPTZ)

Indexes:
- `sessions(workspace_id, created_at desc)`

#### `runs`
- `id` (UUID, PK)
- `tenant_id` (UUID, nullable)
- `session_id` (UUID, FK -> sessions.id)
- `runner_run_id` (TEXT, required)
- `status` (TEXT, required) values: `running`, `completed`, `error`
- `created_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ, nullable)

Indexes:
- `runs(session_id, created_at desc)`

#### `run_events`
Lossless raw event storage.

- `id` (BIGSERIAL, PK)
- `run_id` (UUID, FK -> runs.id)
- `seq` (INT, required) monotonically increasing per run
- `at` (TIMESTAMPTZ, required)
- `source` (TEXT, required) values: `runner`
- `event_type` (TEXT, nullable)  
  Extracted when known (e.g. `run.started`, `assistant.delta`, etc.)
- `raw_json` (JSONB, required)

Indexes:
- `run_events(run_id, seq)` unique

#### `run_transcripts` (optional in v0.2.0)
Derived transcript cache (can be recomputed from events).

- `run_id` (UUID, PK)
- `transcript_json` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 4.2 Retention and governance (initial)

v0.2.0 introduces placeholders for enterprise retention policy:
- Default: retain workspaces and run events indefinitely in dev.
- Design: configurable retention for:
  - workspace directories
  - run event logs
  - transcript caches

---

## 5. Unified runner contract (Codex + Claude)

To keep backend and UI stable, both runners expose the same endpoints.

### 5.1 Runner HTTP endpoints

#### `POST /threads`
Request:
```json
{
  "workingDirectory": "/workspaces/<workspace_id>/...",
  "skipGitRepoCheck": false
}
```
Response:
```json
{ "threadId": "<string>" }
```

#### `POST /runs`
Request:
```json
{ "threadId": "<string>", "prompt": "<string>" }
```
Response:
```json
{ "runId": "<string>" }
```

#### `GET /runs/{runId}/events` (SSE)
- Content-Type: `text/event-stream`
- Each message is `data: <json>\n\n`

Runners may buffer output and replay to late subscribers.

### 5.2 Runner safety requirements

- `workingDirectory` must resolve under `WORKSPACES_ROOT`.
- Runner containers mount `./workspaces:/workspaces`.

### 5.3 Codex runner mapping

Codex runner already streams events from `@openai/codex-sdk`. v0.2.0 adds **no breaking changes**; it will continue to:
- publish raw events
- add wrapper lifecycle events

### 5.4 Claude runner detailed design

Claude runner will be implemented in **Python** (FastAPI) and will stream messages/events as they are produced.

#### 5.4.1 Technology stack

- **Runtime**: Python 3.12
- **Framework**: FastAPI + Uvicorn
- **Anthropic SDK**: `anthropic` Python package (official)
- **Agent capabilities**: Use Claude's tool use (function calling) for file operations, bash commands, etc.

#### 5.4.2 Implementation approach

Option A (preferred): Use Anthropic's official Python SDK with tool use:
- Define tools for: `read_file`, `write_file`, `bash`, `search_files`
- Implement an agent loop that:
  1. Sends user prompt to Claude with tool definitions
  2. Streams response chunks via SSE
  3. When Claude requests a tool call, execute it and continue
  4. Repeat until Claude produces a final response

Option B (fallback): If a production-ready Claude Agent SDK becomes available in Python, adopt it while keeping the runner HTTP contract unchanged.

#### 5.4.3 Directory structure

```
claude-runner/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app with /threads, /runs, /runs/{id}/events
│   ├── agent.py             # Agent loop implementation
│   ├── tools.py             # Tool definitions and executors
│   ├── events.py            # Event envelope helpers
│   └── config.py            # Configuration (WORKSPACES_ROOT, etc.)
```

#### 5.4.4 Tool definitions

```python
TOOLS = [
    {
        "name": "read_file",
        "description": "Read contents of a file",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to working directory"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write contents to a file",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to working directory"},
                "content": {"type": "string", "description": "Content to write"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "bash",
        "description": "Execute a bash command",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Bash command to execute"}
            },
            "required": ["command"]
        }
    },
    {
        "name": "list_files",
        "description": "List files in a directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path relative to working directory"}
            },
            "required": ["path"]
        }
    }
]
```

#### 5.4.5 SSE streaming requirements

The Claude runner must implement the same SSE behavior as the Codex runner:

- **Headers**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`

- **Initial flush**: Send `: connected\n\n` immediately after headers

- **Event format**: `data: <json>\n\n`

- **Buffer replay**: Store events in memory per run; replay to late subscribers

- **Lifecycle events**:
  - `{ "type": "run.started", "runId": "...", "threadId": "..." }`
  - `{ "type": "run.completed", "runId": "...", "threadId": "..." }`
  - `{ "type": "error", "message": "..." }`

#### 5.4.6 Security constraints

- `workingDirectory` must resolve under `WORKSPACES_ROOT`
- Tool execution (bash, file writes) is sandboxed to the working directory
- API-key based Anthropic access only (no claude.ai login embedding)
- Container runs with least-privilege user where possible

---

## 6. Normalized event schema for transcript rendering

The UI should not depend on provider-specific raw event formats.

### 6.1 Event envelope

Every SSE `data` payload sent by runners should follow this envelope:

```json
{
  "v": 1,
  "runId": "<runner_run_id>",
  "provider": "codex|claude",
  "kind": "raw|ui",
  "type": "<string>",
  "at": "<iso8601>",
  "seq": 123,
  "payload": {}
}
```

Rules:
- `kind=raw` payload is the raw SDK event object (lossless).
- `kind=ui` payload is normalized for the UI.

### 6.2 Normalized UI event types

Minimum set (v0.2.0):

- `ui.run.started`
  - payload: `{ "sessionId": "..." }`
- `ui.run.completed`
- `ui.run.error`
  - payload: `{ "message": "..." }`

Transcript types:
- `ui.message.user`
  - payload: `{ "text": "..." }`
- `ui.message.assistant.delta`
  - payload: `{ "textDelta": "..." }`
- `ui.message.assistant.final`
  - payload: `{ "text": "...", "format": "markdown" }`

Optional tool boundary types (best-effort in v0.2.0):
- `ui.tool.call`
  - payload: `{ "toolName": "...", "input": {} }`
- `ui.tool.result`
  - payload: `{ "toolName": "...", "output": {} }`

### 6.3 Mapping strategy

- Codex:
  - Preserve Codex SDK raw event objects as `kind=raw`.
  - Produce `kind=ui` events by extracting:
    - assistant textual output
    - tool calls and tool output where available

- Claude:
  - Preserve Agent SDK raw events as `kind=raw`.
  - Produce `kind=ui` events by extracting:
    - assistant textual output
    - tool calls and results

### 6.4 Persistence

Backend persists all `kind=raw` events losslessly.
- `kind=ui` can be persisted as well, but is optional (can be re-derived).

---

## 7. Backend API design (v0.2.0)

### 7.1 Workspace registry

#### `POST /api/workspaces/import`
Request:
```json
{
  "source_type": "github|local",
  "source_uri": "<string>",
  "display_name": "<optional string>"
}
```
Response:
```json
{
  "workspace_id": "<uuid>",
  "display_name": "<string>",
  "local_path": "/workspaces/<workspace_id>/<name>"
}
```

Rules:
- Backend creates the workspace directory under `WORKSPACES_ROOT`.
- For `github`, backend clones into that directory.
- For `local`, backend imports into that directory once (default `storage_mode=managed_copy`) and then reuses it for future sessions.
- If a workspace already exists for `(source_type, source_uri)`, backend returns the existing workspace instead of duplicating it.

#### `GET /api/workspaces`
Response:
```json
{
  "items": [
    {
      "workspace_id": "<uuid>",
      "display_name": "<string>",
      "source_type": "github|local",
      "source_uri": "<string>",
      "created_at": "<iso8601>"
    }
  ]
}
```

### 7.2 Sessions

#### `POST /api/sessions`
Request:
```json
{
  "workspace_id": "<uuid>",
  "runner_type": "codex|claude"
}
```
Response:
```json
{
  "session_id": "<uuid>",
  "workspace_id": "<uuid>",
  "runner_type": "codex|claude",
  "thread_id": "<string>"
}
```

Session working directory:
- Each session gets its own `working_directory` under the workspace, for example:
  - `/workspaces/<workspace_id>/sessions/<session_id>`
- This allows multiple sessions to operate concurrently on the same project without stepping on each other.
- Recommended implementation for git repositories: use `git worktree` so sessions do not duplicate git objects.

### 7.3 Runs

#### `POST /api/sessions/{session_id}/prompt`
Request:
```json
{ "prompt": "<string>" }
```
Response:
```json
{ "run_id": "<uuid>" }
```

#### `GET /api/runs/{run_id}/events` (SSE)
- Backend proxies the selected runner SSE stream.
- Backend additionally persists incoming events to Postgres.

#### `GET /api/runs/{run_id}`
Response includes status and metadata.

---

## 8. Chat UI design (v0.2.0)

### 8.1 UI requirements

- Runner selector (Codex/Claude)
- Workspace import section
- Workspace dropdown
- Session list and selection
- Transcript panel (Markdown rendering)
- Raw events panel (lossless)

### 8.2 Recommended approach

- Render transcript from normalized UI events.
- Store raw logs and allow users/operators to view them.

### 8.3 Detailed UI components

#### 8.3.1 Workspace import panel

Location: Top of `/codex` page

Elements:
- **Source type selector**: Radio buttons or tabs for "GitHub URL" / "Local Path"
- **Source input**: Text input for URL or path
- **Display name input**: Optional text input (auto-derived if empty)
- **Import button**: Triggers `POST /api/workspaces/import`
- **Status indicator**: Shows import progress/success/error

#### 8.3.2 Workspace dropdown

Location: Below import panel

Elements:
- **Dropdown**: Lists all imported workspaces from `GET /api/workspaces`
- **Display format**: `{display_name} ({source_type})`
- **Refresh button**: Re-fetches workspace list

#### 8.3.3 Session list panel

Location: Below workspace dropdown (visible when workspace selected)

Elements:
- **Session list**: Table/list showing sessions for selected workspace
  - Columns: Created time, Runner type, Status (active/completed)
- **New session button**: Opens runner selection, then calls `POST /api/sessions`
- **Continue session button**: Selects existing session for prompting

#### 8.3.4 Runner selector

Location: In "New session" dialog/flow

Elements:
- **Runner dropdown**: "Codex" / "Claude"
- **Create button**: Creates session with selected runner type

Note: Runner type is **fixed per session**. To switch runners, create a new session.

#### 8.3.5 Prompt input panel

Location: Below session panel (visible when session selected)

Elements:
- **Prompt textarea**: Multi-line input for user prompt
- **Run button**: Triggers `POST /api/sessions/{session_id}/prompt`
- **Status indicator**: Shows "running" / "completed" / "error"

#### 8.3.6 Transcript panel (primary view)

Location: Right side or below prompt panel

Elements:
- **Message list**: Scrollable list of messages
  - User messages: Styled as user bubbles
  - Assistant messages: Rendered as Markdown (code blocks, lists, etc.)
  - Tool calls: Collapsible sections showing tool name + input/output
- **Auto-scroll**: Scrolls to bottom as new content arrives
- **Copy button**: Per-message copy to clipboard

Rendering:
- Use `react-markdown` or similar for Markdown rendering
- Syntax highlighting for code blocks (e.g., `highlight.js` or `prism`)

#### 8.3.7 Raw events panel (debug view)

Location: Toggleable tab/panel alongside transcript

Elements:
- **Event list**: Scrollable list of raw JSON events
- **Timestamp**: ISO8601 timestamp per event
- **Event type badge**: Visual indicator of event type
- **JSON viewer**: Collapsible/expandable JSON display
- **Filter input**: Filter events by type

#### 8.3.8 UI state management

State to track:
- `workspaces: Workspace[]` — list of imported workspaces
- `selectedWorkspaceId: string | null`
- `sessions: Session[]` — sessions for selected workspace
- `selectedSessionId: string | null`
- `currentRunId: string | null`
- `events: EventLine[]` — events for current run
- `status: 'idle' | 'creating-session' | 'running' | 'completed' | 'error'`

Data flow:
1. On page load: fetch workspaces
2. On workspace select: fetch sessions for workspace
3. On session select or create: enable prompt input
4. On run prompt: open SSE stream, accumulate events, render transcript

---

## 9. Microservices detailed API designs

These are "working placeholders": small, real services with stable APIs.

### 9.1 Prompt Manager service

Base URL: `PROMPT_MANAGER_URL`

#### `POST /templates`
Create template.

Request:
```json
{
  "name": "<string>",
  "description": "<string>",
  "template": "<string>",
  "variables": ["var1", "var2"]
}
```

#### `GET /templates`
List templates.

#### `GET /templates/{template_id}`
Fetch template.

#### `POST /templates/{template_id}/render`
Request:
```json
{ "params": { "var1": "..." } }
```
Response:
```json
{ "rendered": "<string>" }
```

### 9.2 Evaluation service

Base URL: `EVALUATION_URL`

#### `POST /evaluate`
Request:
```json
{
  "input": { "prompt": "..." },
  "output": { "text": "..." },
  "criteria": ["accuracy", "safety", "completeness"],
  "context": { "workspace_id": "...", "run_id": "..." }
}
```
Response:
```json
{
  "scores": { "accuracy": 0.0, "safety": 0.0, "completeness": 0.0 },
  "overall": 0.0,
  "notes": "<string>"
}
```

LangSmith integration:
- v0.2.0 design includes emitting traces and storing dataset/eval run IDs in `metadata_json`.

### 9.3 Memory service

Base URL: `MEMORY_URL`

#### `POST /memories`
Request:
```json
{
  "scope": "session|workspace",
  "scope_id": "<uuid>",
  "kind": "episodic|long_term",
  "text": "<string>",
  "tags": ["..."]
}
```

#### `POST /memories/query`
Request:
```json
{
  "scope": "session|workspace",
  "scope_id": "<uuid>",
  "query": "<string>",
  "top_k": 10
}
```
Response:
```json
{
  "items": [
    { "id": "...", "text": "...", "score": 0.0, "tags": ["..."] }
  ]
}
```

### 9.4 LLM Gateway service (LLMLite-like)

Base URL: `LLM_GATEWAY_URL`

#### `POST /chat`
Request:
```json
{
  "provider": "openai|anthropic",
  "model": "<string>",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "metadata": { "tenant_id": "...", "run_id": "..." }
}
```
Response:
```json
{ "text": "...", "usage": { "input_tokens": 0, "output_tokens": 0 } }
```

Gateway responsibilities:
- Centralize provider credentials (no keys in frontend)
- Add usage logging and tags
- Enforce allowlist policies for models

---

## 10. Google Drive / SharePoint (designed for later phase)

These sources require authentication and connector management.

Design approach:
- Introduce a future "Connector Service" that:
  - manages OAuth/OIDC credentials
  - uses provider SDKs or MCP servers to list/download folders
  - imports content into `WORKSPACES_ROOT`

v0.2.0 stance:
- Documented as planned capability; not implemented.

---

## 11. NHS enterprise considerations (designed)

v0.2.0 design explicitly prepares for:

- Audit log and retention policies
- Tenant scoping (future): every workspace/session/run should be tenant-scoped
- Data classification:
  - treat all imported content as potentially sensitive
- Observability:
  - structured logs per run/session

---

## 12. SSE streaming E2E implementation

### 12.1 SSE reliability requirements

All SSE endpoints across the stack must implement:

1. **Anti-buffering headers**:
   - `Content-Type: text/event-stream; charset=utf-8`
   - `Cache-Control: no-cache, no-transform`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no`

2. **Early flush**: Send headers and initial comment immediately
   - `: connected\n\n`

3. **Event format**: Standard SSE format
   - `data: <json>\n\n`

4. **Late subscriber replay**: Buffer events in memory per run; replay to new subscribers

5. **Graceful termination**: Send final event before closing stream
   - `{ "type": "stream.closed", "runId": "...", "status": "completed|error" }`

### 12.2 Implementation by layer

#### Runner layer (Codex + Claude)

Both runners must:
- Set SSE headers with anti-buffering directives
- Call `res.flushHeaders()` (Node) or equivalent (Python)
- Write initial `: connected\n\n` comment
- Buffer all events per run in memory
- Replay buffer to late subscribers
- End stream after `run.completed` or `error`

#### Backend layer (FastAPI)

The backend SSE proxy must:
- Yield initial `: connected\n\n` before proxying
- Request SSE from runner with `Accept: text/event-stream`
- Stream bytes from runner without buffering
- Set anti-buffering response headers
- Persist events to Postgres as they arrive (v0.2.0)

#### Frontend layer (Next.js API route)

The Next.js SSE proxy must:
- Set `runtime = "nodejs"` and `dynamic = "force-dynamic"`
- Request SSE from backend with `Accept: text/event-stream`
- Pass through response body as stream
- Set anti-buffering response headers

#### Browser layer (EventSource)

The frontend page must:
- Use `EventSource` to connect to `/api/runs/{runId}/events`
- Parse `data:` lines as JSON
- Accumulate events in state
- Handle `onerror` gracefully (set status, close connection)

### 12.3 Testing SSE streaming

Manual verification:
```bash
# Direct runner test
curl -N http://localhost:9102/runs/<runId>/events

# Backend proxy test
curl -N http://localhost:9101/api/runs/<runId>/events

# Next.js proxy test
curl -N http://localhost:9100/api/runs/<runId>/events
```

Expected behavior:
- Connection opens immediately
- `: connected` comment arrives first
- Events stream incrementally (not batched at end)
- Stream closes after final event

---

## 13. Implementation sequence and approval checkpoints

### Priority order (as confirmed)

1. **Claude Code agent SDK runner** (new Python microservice)
2. **UI uplift** (workspace import, runner dropdown, session list, transcript UI, raw logs)
3. **SSE E2E implementation** (ensure streaming works across all layers)
4. **Persistence schema** (workspaces, sessions, runs, run_events tables)
5. **Workspace registry endpoints** (import, list)
6. **Session management endpoints** (list sessions, continue session)
7. **Microservices placeholders** (Prompt Manager, Evaluation, Memory, LLM Gateway)

### Milestone A: Claude runner (Priority 1) ✅ COMPLETE

Tasks:
- [x] Create `claude-runner/` directory structure
- [x] Implement FastAPI app with `/health`, `/threads`, `/runs`, `/runs/{id}/events`
- [x] Implement agent loop with tool use (read_file, write_file, bash, list_files)
- [x] Implement SSE streaming with buffer replay
- [x] Add Dockerfile and requirements.txt
- [x] Add to docker-compose.yml
- [x] Test with curl and browser

Acceptance criteria:
- ✅ Claude runner starts and responds to health check
- ✅ Can create thread, start run, stream events
- ✅ Events arrive incrementally (not batched)
- ✅ Tool calls execute and results stream back

### Milestone B: UI uplift (Priority 2) ✅ COMPLETE

Tasks:
- [x] Add workspace import panel (GitHub URL / local path)
- [x] Add workspace dropdown (backend ready, UI uses input field)
- [x] Add session list panel (backend ready)
- [x] Add runner selector (Codex / Claude)
- [x] Replace raw JSON textarea with transcript panel (Markdown)
- [x] Add raw events panel (toggleable)
- [x] Add react-markdown and syntax highlighting
- [x] Wire up to new backend endpoints

Acceptance criteria:
- ✅ Can import workspace from GitHub URL
- ✅ Can select workspace and see sessions (API ready)
- ✅ Can create new session with runner choice
- ⚠️ Continue existing session (API ready, UI pending)
- ✅ Transcript renders Markdown correctly
- ✅ Raw events panel shows JSON

### Milestone C: SSE E2E (Priority 3) ✅ COMPLETE

Tasks:
- [x] Verify SSE headers in runner (already done for Codex)
- [x] Verify SSE headers in Claude runner
- [x] Verify SSE proxy in backend
- [x] Verify SSE proxy in Next.js route
- [x] Add E2E test for SSE streaming

Acceptance criteria:
- ✅ `curl -N` shows incremental events at all layers
- ✅ Browser EventSource receives events incrementally
- ✅ No buffering delays

### Milestone D: Persistence (Priority 4) ⚠️ PARTIAL

Tasks:
- [x] Create Alembic migration for workspaces, sessions, runs, run_events tables
- [x] Add SQLAlchemy models
- [ ] Update backend to persist workspaces on import (schema ready, queries in-memory)
- [ ] Update backend to persist sessions on create (schema ready, queries in-memory)
- [ ] Update backend to persist runs and events on prompt (schema ready, queries in-memory)

Acceptance criteria:
- ⚠️ Data persists across container restarts (pending: wire to Postgres)
- ⚠️ Can query past runs and events (pending: wire to Postgres)

### Milestone E: Workspace and session endpoints (Priority 5-6) ✅ COMPLETE

Tasks:
- [x] Implement `POST /api/workspaces/import`
- [x] Implement `GET /api/workspaces`
- [x] Implement `GET /api/workspaces/{id}/sessions`
- [x] Implement `POST /api/sessions` with workspace_id and runner_type
- [x] Implement `GET /api/sessions/{id}`

Acceptance criteria:
- ✅ Workspace import de-duplicates by source
- ✅ Sessions list shows all sessions for workspace
- ✅ Session creation routes to correct runner

### Milestone F: Microservices (Priority 7) ✅ COMPLETE (Placeholders)

Tasks:
- [x] Create prompt-manager service (FastAPI)
- [x] Create evaluation service (FastAPI)
- [x] Create memory service (FastAPI)
- [x] Create llm-gateway service (FastAPI)
- [x] Add all to docker-compose.yml
- [x] Implement basic CRUD/query endpoints

Acceptance criteria:
- ✅ All services start and respond to health check
- ✅ Basic API calls work

---

## 14. Open questions (resolved and pending)

### Resolved

| Question | Decision |
|----------|----------|
| Claude runner language | Python (FastAPI) |
| Local workspace import | Copy once (managed_copy), de-duplicate by source |
| Session concurrency | Per-session working directories |
| Runner selection | Fixed per session |
| SSE reliability | Anti-buffering headers + flush + replay |

### Pending (to confirm during implementation)

| Question | Notes |
|----------|-------|
| Per-session git worktrees | Recommended for concurrency; confirm if needed in v0.2.0 or defer |
| Claude event mapping | Finalize after capturing sample raw events from implementation |
| Codex event mapping | Finalize after capturing sample raw events |

---

## 16. v0.2.1 Implementation Plan

### 16.1 Scope

v0.2.1 focuses on **production-readiness** by replacing in-memory storage with PostgreSQL persistence and enhancing the UI with proper workspace/session management.

### 16.2 Priority Features

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | PostgreSQL persistence for workspaces | High | ✅ Complete |
| 2 | PostgreSQL persistence for sessions | High | ✅ Complete |
| 3 | PostgreSQL persistence for runs and events | High | ✅ Complete |
| 4 | UI workspace dropdown (select from imported) | High | ✅ Complete |
| 5 | UI session list and selection | High | ✅ Complete |
| 6 | UI run history view | Medium | ✅ Complete |

### 16.3 Technical Implementation

#### 16.3.1 Database Repository Layer

Create a repository pattern for database operations:

```
backend/app/
├── repositories/
│   ├── __init__.py
│   ├── workspace_repo.py    # Workspace CRUD operations
│   ├── session_repo.py      # Session CRUD operations
│   └── run_repo.py          # Run and event operations
```

#### 16.3.2 Workspace Repository

```python
class WorkspaceRepository:
    async def create(self, workspace: WorkspaceCreate) -> Workspace
    async def get_by_id(self, workspace_id: UUID) -> Workspace | None
    async def get_by_source(self, source_type: str, source_uri: str) -> Workspace | None
    async def list_all(self, tenant_id: UUID | None = None) -> list[Workspace]
    async def update_last_accessed(self, workspace_id: UUID) -> None
```

#### 16.3.3 Session Repository

```python
class SessionRepository:
    async def create(self, session: SessionCreate) -> Session
    async def get_by_id(self, session_id: UUID) -> Session | None
    async def list_by_workspace(self, workspace_id: UUID) -> list[Session]
```

#### 16.3.4 Run Repository

```python
class RunRepository:
    async def create(self, run: RunCreate) -> Run
    async def get_by_id(self, run_id: UUID) -> Run | None
    async def update_status(self, run_id: UUID, status: str, completed_at: datetime | None) -> None
    async def list_by_session(self, session_id: UUID) -> list[Run]
    async def add_event(self, run_id: UUID, event: RunEventCreate) -> RunEvent
    async def get_events(self, run_id: UUID) -> list[RunEvent]
```

### 16.4 UI Enhancements

#### 16.4.1 Workspace Dropdown

- Fetch workspaces on page load via `GET /api/workspaces`
- Display dropdown with `display_name (source_type)`
- On select, fetch sessions for that workspace
- "Import New" button to show import form

#### 16.4.2 Session List

- Fetch sessions via `GET /api/workspaces/{id}/sessions`
- Display list with: created time, runner type, run count
- "New Session" button with runner selection
- "Continue" button to select existing session

#### 16.4.3 Run History

- Fetch runs via `GET /api/sessions/{id}/runs`
- Display list with: prompt preview, status, created time
- Click to view transcript from persisted events

### 16.5 API Additions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions/{id}/runs` | GET | List runs for a session |
| `/api/runs/{id}` | GET | Get run details with status |
| `/api/runs/{id}/transcript` | GET | Get derived transcript from events |

### 16.6 Acceptance Criteria

- [x] Workspaces persist across container restarts
- [x] Sessions persist across container restarts
- [x] Runs and events persist across container restarts
- [x] UI shows workspace dropdown with imported workspaces
- [x] UI shows session list for selected workspace
- [x] UI allows continuing existing session
- [x] UI shows run history for selected session
- [x] Past transcripts can be viewed from persisted events

### 16.7 Files Changed (v0.2.1)

| File | Change |
|------|--------|
| `backend/app/main.py` | Replaced with database-backed version |
| `backend/app/main_inmemory.py` | Preserved original in-memory version |
| `backend/app/repositories/__init__.py` | Repository exports |
| `backend/app/repositories/workspace_repo.py` | Workspace CRUD operations |
| `backend/app/repositories/session_repo.py` | Session CRUD operations |
| `backend/app/repositories/run_repo.py` | Run and event operations |
| `frontend/src/app/(app)/codex/page.tsx` | Workspace dropdown, session list, run history |
| `frontend/src/app/api/sessions/[sessionId]/runs/route.ts` | API route for runs list |

---

## 17. v0.2.2 Implementation Plan: Local Folder Import (✅ COMPLETE)

### 17.1 Overview

v0.2.2 adds the ability to import manually copied folders into the workspace system. This enables users to:
- Copy any project folder into `/workspaces/{name}/repo/`
- Scan for unregistered folders via UI
- Import discovered folders with custom display names
- Work with local projects the same as GitHub imports

### 17.2 Architecture Decision

**Chosen Approach: Flat with Source Types**

```
/workspaces/
├── {uuid}/repo/          # source_type: "github" (git clone)
├── {uuid}/repo/          # source_type: "local" (manually copied)
└── {folder-name}/repo/   # source_type: "local" (user-named)
```

**Rationale**:
- Maintains backward compatibility with existing structure
- Simple implementation without migration
- Supports future multi-project hierarchies
- Clear source identification for UI display

**Concurrency Considerations**:
- Each workspace has isolated directory
- Sessions are scoped to workspace
- Multiple users can work on different workspaces concurrently
- Future: tenant_id field enables multi-tenant isolation

### 17.3 API Design

#### 17.3.1 Scan for Unregistered Folders

```
GET /api/workspaces/scan
```

**Response**:
```json
{
  "discovered": [
    {
      "folder_name": "my-project",
      "path": "/workspaces/my-project/repo",
      "has_git": true,
      "git_remote": "https://github.com/user/repo",
      "suggested_name": "user/repo"
    },
    {
      "folder_name": "local-code",
      "path": "/workspaces/local-code/repo",
      "has_git": false,
      "git_remote": null,
      "suggested_name": "local-code"
    }
  ]
}
```

**Logic**:
1. List all directories in `/workspaces/`
2. For each directory with `/repo` subfolder:
   - Check if already registered in database
   - If not, check for `.git` and extract remote URL
   - Add to discovered list with metadata

#### 17.3.2 Import Local Folder

```
POST /api/workspaces/import-local
```

**Request**:
```json
{
  "folder_name": "my-project",
  "display_name": "My Custom Project"
}
```

**Response**:
```json
{
  "workspace_id": "uuid",
  "display_name": "My Custom Project",
  "source_type": "local",
  "source_uri": "/workspaces/my-project/repo",
  "local_path": "/workspaces/my-project/repo"
}
```

**Logic**:
1. Validate folder exists at `/workspaces/{folder_name}/repo`
2. Check not already registered
3. Create workspace record with `source_type: "local"`
4. Return workspace details

### 17.4 UI Design

#### 17.4.1 Scan Local Button

Add "Scan Local" button next to "+ Import":

```
┌─────────────────────────────────────────────┐
│ Workspace                                    │
│ ┌─────────────────────────┐ [+ Import] [🔍] │
│ │ Select a workspace...   │                 │
│ └─────────────────────────┘                 │
└─────────────────────────────────────────────┘
```

#### 17.4.2 Discovered Folders Modal

When "Scan Local" clicked, show modal with discovered folders:

```
┌─────────────────────────────────────────────┐
│ Discovered Local Folders                     │
├─────────────────────────────────────────────┤
│                                              │
│ ☑ my-project (git: user/repo)               │
│   Display name: [user/repo          ]       │
│                                              │
│ ☑ local-code (no git)                       │
│   Display name: [local-code         ]       │
│                                              │
│ ☐ already-imported (already registered)     │
│                                              │
│              [Cancel] [Import Selected]      │
└─────────────────────────────────────────────┘
```

### 17.5 Implementation Files

| File | Change |
|------|--------|
| `backend/app/main.py` | Add `/api/workspaces/scan` and `/api/workspaces/import-local` endpoints |
| `frontend/src/app/api/workspaces/scan/route.ts` | Proxy route for scan endpoint |
| `frontend/src/app/api/workspaces/import-local/route.ts` | Proxy route for import-local endpoint |
| `frontend/src/app/(app)/codex/page.tsx` | Add Scan Local button and modal |

### 17.6 Acceptance Criteria

- [x] `GET /api/workspaces/scan` returns unregistered folders
- [x] `POST /api/workspaces/import-local` registers local folder
- [x] UI shows "Scan Local" button
- [x] Modal displays discovered folders with git info
- [x] User can set custom display name
- [x] Imported local folders appear in workspace dropdown
- [x] Local folders work identically to GitHub imports for sessions/runs

### 17.7 Concurrency and Multi-User Support

**Current Design (v0.2.x)**:
- Single-tenant, single-user focus
- Workspaces isolated by directory
- Sessions scoped to workspace
- Concurrent sessions on different workspaces supported

**Future Design (v0.3.0+)**:
- `tenant_id` field in all tables enables multi-tenant
- User authentication links sessions to users
- RBAC controls workspace access
- Concurrent multi-user, multi-project fully supported

### 17.8 Files Changed (v0.2.2)

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `DiscoveredFolder`, `ScanWorkspacesResponse`, `ImportLocalRequest` models; Added `scan_workspaces()` and `import_local_workspace()` endpoints |
| `frontend/src/app/api/workspaces/scan/route.ts` | New proxy route for scan endpoint |
| `frontend/src/app/api/workspaces/import-local/route.ts` | New proxy route for import-local endpoint |
| `frontend/src/app/(app)/codex/page.tsx` | Added `DiscoveredFolder` type, scan modal state, `onScanLocal()`, `onImportSelectedFolders()`, `toggleFolderSelection()` functions, Scan button, and modal UI |
| `docs/v0.2.0_Implementation_Plan.md` | Added Section 17 with v0.2.2 design |
| `docs/v0.2.0_Status_and_Roadmap.md` | Updated v0.2.1 and v0.2.2 status |
| `README.md` | Updated with v0.2.1 and v0.2.2 release notes |

---

## 18. v0.2.3 Implementation Plan: Real-Time Workspace Sync (✅ COMPLETE)

### 18.1 Overview

v0.2.3 ensures the workspace dropdown always reflects the real filesystem state, not just database records. This handles scenarios where users manually delete folders.

### 18.2 Problem Statement

- User imports workspaces via UI → stored in database
- User manually deletes folder from `/workspaces/`
- Dropdown still shows deleted workspace (stale data)
- Clicking on deleted workspace causes errors

### 18.3 Solution

1. **Backend filtering**: `/api/workspaces` endpoint checks if each workspace's `local_path` exists on disk before including in response
2. **Cache bypass**: All frontend API proxy routes use `cache: "no-store"` to prevent Next.js from caching responses

### 18.4 Implementation

**Backend** (`backend/app/main.py`):
```python
@app.get("/api/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    repo = WorkspaceRepository(db)
    workspaces = await repo.list_all()
    # Filter to only include workspaces whose folders still exist on disk
    items = [
        WorkspaceResponse(...)
        for ws in workspaces
        if pathlib.Path(ws.local_path).exists()
    ]
    return WorkspaceListResponse(items=items)
```

**Frontend API routes** - Added `cache: "no-store"` to:
- `/api/workspaces/route.ts`
- `/api/workspaces/scan/route.ts`
- `/api/workspaces/[workspaceId]/sessions/route.ts`
- `/api/sessions/[sessionId]/runs/route.ts`

### 18.5 Acceptance Criteria

- [x] Dropdown only shows workspaces with existing folders
- [x] Manually deleted folders disappear from dropdown immediately
- [x] No stale/cached data in API responses
- [x] E2E tested with mem0 repo clone and import

### 18.6 Files Changed (v0.2.3)

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `pathlib.Path(ws.local_path).exists()` filter to `list_workspaces()` |
| `frontend/src/app/api/workspaces/route.ts` | Added `cache: "no-store"` |
| `frontend/src/app/api/workspaces/scan/route.ts` | Added `cache: "no-store"` |
| `frontend/src/app/api/workspaces/[workspaceId]/sessions/route.ts` | Added `cache: "no-store"` |
| `frontend/src/app/api/sessions/[sessionId]/runs/route.ts` | Added `cache: "no-store"` |

---

## 19. v0.2.4 Implementation Plan: Enterprise Chat UI (✅ COMPLETE)

### 19.1 Overview

v0.2.4 introduces a dedicated `/chat` page with a ChatGPT/Claude-style conversational interface. This provides an enterprise-grade chat experience while keeping the existing `/codex` page for simple task-based workflows.

### 19.2 Design Goals

1. **Familiar UX**: ChatGPT/Claude-style vertical message flow
2. **Persistence**: All conversations saved to database
3. **Multi-Session**: Switch between sessions, view history
4. **Rich Rendering**: Markdown with syntax-highlighted code blocks
5. **Real-time**: Streaming responses with typing indicator
6. **Lightweight**: Reuse existing infrastructure, minimal new code

### 19.3 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (left)    │  Chat Panel (center/right)              │
│ ─────────────────│──────────────────────────────────────────│
│ Workspaces       │  ┌─────────────────────────────────────┐ │
│ Sessions         │  │ Chat History (scrollable)           │ │
│ Runner Select    │  │  [User] message                     │ │
│                  │  │  [Assistant] response (MD)          │ │
│                  │  │  [Tool] shell command               │ │
│                  │  └─────────────────────────────────────┘ │
│                  │  ┌─────────────────────────────────────┐ │
│                  │  │ [Input box]              [Send ▶]  │ │
│                  │  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 19.4 Database Schema

**New Table: `messages`**

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    run_id UUID REFERENCES runs(id),
    role VARCHAR(20) NOT NULL,  -- user, assistant, tool, system
    content TEXT NOT NULL,
    metadata_json JSONB,        -- tool_name, tool_input, tool_output
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_message_session_created ON messages(session_id, created_at);
```

### 19.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions/{id}/messages` | List all messages for a session |
| `POST` | `/api/sessions/{id}/messages` | Create a new message |

**Request/Response Models**:

```python
class MessageResponse(BaseModel):
    message_id: str
    session_id: str
    run_id: Optional[str]
    role: str
    content: str
    metadata: Optional[dict]
    created_at: str

class CreateMessageRequest(BaseModel):
    role: str
    content: str
    run_id: Optional[str]
    metadata: Optional[dict]
```

### 19.6 Frontend Components

| Component | Description |
|-----------|-------------|
| `ChatPage` | Main page component with layout and state management |
| `MessageBubble` | Renders individual messages with role-based styling |
| `ToolCallCard` | Collapsible card for tool calls with input/output |
| `CodeBlock` | Syntax-highlighted code using Prism |

**Key Features**:
- `react-markdown` with `remark-gfm` for Markdown rendering
- `react-syntax-highlighter` with Prism for code blocks
- Real-time streaming with cursor indicator
- Auto-scroll to latest message
- Enter to send, Shift+Enter for new line

### 19.7 Data Flow

```
1. User types message
2. POST /api/sessions/{id}/messages (persist user message)
3. POST /api/sessions/{id}/prompt (start run)
4. GET /api/runs/{id}/events (SSE stream)
5. Parse events → update streaming content
6. On completion → POST /api/sessions/{id}/messages (persist assistant + tool messages)
7. Page refresh → GET /api/sessions/{id}/messages (restore history)
```

### 19.8 Acceptance Criteria

- [x] `/chat` page accessible from sidebar navigation
- [x] Workspace dropdown with real-time sync
- [x] Session list with create/select functionality
- [x] ChatGPT-style message bubbles
- [x] Markdown rendering with GFM support
- [x] Syntax highlighting for code blocks
- [x] Tool call cards with collapsible details
- [x] Message persistence to `messages` table
- [x] History loading on session select
- [x] Real-time streaming with cursor indicator
- [x] Error handling with system messages
- [x] Enter to send, Shift+Enter for new line

### 19.9 Files Changed (v0.2.4)

| File | Change |
|------|--------|
| `backend/app/models.py` | Added `Message` model |
| `backend/app/repositories/message_repo.py` | **New** - MessageRepository class |
| `backend/app/repositories/__init__.py` | Export MessageRepository |
| `backend/app/main.py` | Added `MessageResponse`, `CreateMessageRequest`, `list_messages()`, `create_message()` endpoints |
| `frontend/src/app/api/sessions/[sessionId]/messages/route.ts` | **New** - API proxy for messages |
| `frontend/src/app/(app)/chat/page.tsx` | **New** - Enterprise Chat UI page |
| `frontend/src/app/(app)/chat/layout.tsx` | **New** - Chat layout wrapper |
| `frontend/src/components/Sidebar.tsx` | Added Chat link to navigation |
| `frontend/package.json` | Added `react-syntax-highlighter` dependency |
| `docs/Product_Requirements_v0.2.0.md` | Added FR-4.1 Enterprise Chat UI |
| `docs/v0.2.0_Implementation_Plan.md` | Added Section 19 (v0.2.4 design) |
| `docs/v0.2.0_Status_and_Roadmap.md` | Updated with v0.2.4 status |

### 19.10 Next Actions

| Priority | Action | Status |
|----------|--------|--------|
| High | Test Chat UI with Codex runner | 🔜 Pending |
| High | Test Chat UI with Claude runner | 🔜 Pending |
| Medium | Add message search/filter | 🔜 Future |
| Medium | Add conversation export (MD/PDF) | 🔜 Future |
| Medium | Add message copy to clipboard | 🔜 Future |
| Low | Add typing indicators for multi-user | 🔜 Future |

---

## 15. Files changed (dev/v0.2.0 branch)

All changes are committed to the `dev/v0.2.0` branch.

### Commit 1: Design docs and SSE hardening

| File | Change |
|------|--------|
| `runner/src/server.ts` | SSE hardening (headers, flush, initial comment) |
| `backend/app/main.py` | SSE proxy hardening (headers, flush, initial comment) |
| `frontend/src/app/api/runs/[runId]/events/route.ts` | SSE proxy hardening (headers) |
| `frontend/Dockerfile` | Fixed to run standalone server |
| `docs/Product_Requirements_v0.2.0.md` | Created + updated with session continuation |
| `docs/v0.2.0_Implementation_Plan.md` | Created + comprehensive revisions |
| `docs/Solution_Design.md` | Updated to reference v0.2.0 docs |
| `docs/Frontend_UI_Plan.md` | Updated with v0.2.0 UI uplift scope |

### Commit 2: Claude runner microservice

| File | Change |
|------|--------|
| `claude-runner/Dockerfile` | Python 3.12 + FastAPI container |
| `claude-runner/requirements.txt` | Dependencies (fastapi, uvicorn, anthropic, pydantic) |
| `claude-runner/app/__init__.py` | Package init |
| `claude-runner/app/main.py` | FastAPI app with /threads, /runs, /runs/{id}/events |
| `claude-runner/app/agent.py` | Agent loop with tool use |
| `claude-runner/app/tools.py` | Tool definitions and executors |
| `claude-runner/app/events.py` | Event envelope helpers |
| `claude-runner/app/config.py` | Configuration |
| `docker-compose.yml` | Added claude-runner service + backend env vars |

### Commit 3: UI uplift and backend routing

| File | Change |
|------|--------|
| `frontend/src/app/(app)/codex/page.tsx` | Runner dropdown, transcript view, raw events toggle |
| `frontend/package.json` | Added react-markdown, remark-gfm |
| `backend/app/main.py` | Runner routing based on runner_type |

### Commit 4: E2E test for SSE streaming

| File | Change |
|------|--------|
| `tests/test_sse_streaming.py` | E2E test for SSE verification |
| `tests/requirements.txt` | Test dependencies (httpx, pytest) |
