# Product Requirements — v0.2.0 (Next Release)

## 1. Release overview

v0.2.0 upgrades the current MVP (repo URL -> session -> prompt -> SSE event stream) into a more product-shaped platform by adding:

- Multi-runner support (Codex + Claude Agent SDK)
- Workspace import + workspace registry (GitHub URL + local path)
- A human-friendly chat transcript UI (Markdown), while persisting raw runner events for audit/debug
- Initial working “microservice placeholders” for prompts, evals, memory, and an LLM gateway

This release is targeted at early NHS-style integration engineering use cases, prioritizing:

- Repeatability and auditability
- Workspace isolation
- Clear separation between raw machine events and human-readable transcripts

## 2. Current baseline (v0.1.x)

- Frontend: Next.js dashboard shell with `/codex` workflow
- Backend: FastAPI session orchestration (clone repo, create runner thread, start run, proxy SSE)
- Runner (Codex): Node + `@openai/codex-sdk` streaming SSE events
- State is in-memory (sessions/threads/runs); Postgres exists but is not used for persistence

## 3. Goals

- Provide a consistent UX for running an agent against a workspace, regardless of runner provider.
- Allow users to reuse imported workspaces across sessions and runs.
- Improve operator and user confidence via persisted transcripts and basic run history.
- Lay a working foundation for prompts, evaluation, memory, and gateway services.

## 4. Non-goals (explicitly out of scope for v0.2.0)

- Full auth/tenancy (OIDC/SSO), RBAC, billing
- Private repo access (GitHub App / deploy keys)
- Google Drive / SharePoint ingestion (planned later; requires auth/connectors)
- Production-grade sandboxing/remote execution (current isolation boundary is Docker)
- Full diff/patch apply UX (planned later)

## 5. Personas

- Integration engineer
- Solution architect
- Engineering manager / compliance

## 6. Functional requirements

### FR-1 Multi-runner selection (Codex + Claude)

- The UI must allow selecting an agent runner type:
  - `codex` (existing)
  - `claude` (new)

Acceptance criteria:
- A dropdown exists on the Codex page to select runner.
- Creating a session records the chosen runner type.
- Prompt runs stream events end-to-end for both runner types.

Notes/constraints:
- Claude Agent SDK usage must be API-key based. (No “claude.ai login” embedding.)

### FR-2 Workspace import (GitHub + local path)

Users can add workspaces by either:
- GitHub URL (clone)
- Local workspace path (server-side accessible path)

Conceptual model:
- A `workspace` is the durable representation of a single imported project.
- A `session` is a durable conversational context bound to a workspace and a runner type.
- A `run` is one prompt execution within a session.

Acceptance criteria:
- UI supports both import methods.
- Imported workspace is assigned a stable `workspace_id`.
- Backend stores/imports the workspace into the project-controlled `WORKSPACES_ROOT`.
- Import is de-duplicated: importing the same `(source_type, source_uri)` returns the existing workspace rather than creating a duplicate.

### FR-3 Workspace registry + sensible names

- The UI must display a dropdown of imported workspaces.
- Display names must be sensible:
  - For GitHub: repo name (or owner/repo)
  - For local: folder name; if git remote exists, prefer remote repo name

Acceptance criteria:
- Workspace dropdown shows `display_name` and a stable identifier.
- Selecting a workspace is required before creating a new session.

### FR-3.1 Session selection and continuation

- Users must be able to view and select existing sessions for a workspace.
- Users must be able to continue an existing session (instead of always creating a new one).
- Runner type is fixed per session; switching between Codex and Claude is done by creating a new session for the same workspace.

Acceptance criteria:
- UI lists sessions for the selected workspace (created time, runner type, status).
- UI supports:
  - create new session
  - continue existing session

### FR-4 Chat transcript UI (Markdown) + raw event view

- The primary run experience must be a readable chat transcript:
  - user prompt(s)
  - assistant response(s) rendered as Markdown
- Raw runner events must still be accessible for debugging.

Acceptance criteria:
- UI includes:
  - Transcript panel (human-readable)
  - Raw events panel (JSON/event stream)
- Responses render Markdown correctly (code blocks, lists).

### FR-4.1 Enterprise Chat UI (v0.2.4)

A dedicated `/chat` page provides a ChatGPT/Claude-style conversational interface:

**User Experience**:
- Full-height chat layout with messages scrolling vertically
- User messages appear on right (blue), assistant on left (white)
- Real-time streaming with typing indicator
- Tool calls displayed as collapsible cards with input/output
- Syntax-highlighted code blocks (Prism)
- Enter to send, Shift+Enter for new line

**Conversation Persistence**:
- All messages (user, assistant, tool, system) persisted to database
- Chat history loads when selecting an existing session
- Messages linked to runs for traceability

**Multi-Session Support**:
- Left sidebar shows workspace selector and session list
- Create new sessions with runner type selection
- Switch between sessions to view different conversations
- Session indicator shows runner type (Codex/Claude)

Acceptance criteria:
- [x] `/chat` page accessible from sidebar navigation
- [x] Workspace dropdown with real-time sync
- [x] Session list with create/select functionality
- [x] ChatGPT-style message bubbles with MD rendering
- [x] Syntax highlighting for code blocks
- [x] Tool call cards with collapsible details
- [x] Message persistence to `messages` table
- [x] History loading on session select
- [x] Real-time streaming with cursor indicator
- [x] Error handling with system messages

### FR-5 Persisted runs and transcripts (minimal persistence)

- Runs must be persisted so transcripts can be revisited.

Acceptance criteria:
- A completed run can be re-opened by ID and its transcript/events are retrievable.
- Raw events are stored as received (lossless).

### FR-6 Microservices (working placeholders)

#### FR-6.1 Prompt Manager service
- Store parameterized prompt templates
- Render a prompt by applying parameters
- Maintain basic versioning

Acceptance criteria:
- CRUD endpoints exist and function.
- Backend can fetch a template and render it for a run.

#### FR-6.2 Evaluation service
- Integrate LangSmith tracing hooks (initial)
- Provide a minimal evaluation endpoint that can score an output using configured evaluators

Acceptance criteria:
- Service runs in docker-compose.
- A basic evaluation request returns a score + rationale.

#### FR-6.3 Memory service
- Store and retrieve:
  - short-term session memory
  - long-term workspace/project memory

Acceptance criteria:
- Service runs in docker-compose.
- API supports `put` and `query`.

#### FR-6.4 LLM Gateway service
- Provide a single internal API for calling LLM providers
- Log usage (request metadata) for audit and future cost tracking

Acceptance criteria:
- Service runs in docker-compose.
- A test call can be routed to at least one provider.

## 7. Non-functional requirements (NHS-ready baseline)

- Auditability
  - Persist raw prompts and raw runner events
  - Record timestamps and run/session/workspace IDs
- Security
  - No secrets committed
  - Workspace path must be validated under `WORKSPACES_ROOT`
- Reliability
  - SSE streaming should tolerate reconnect (minimum: runner buffer replay)
- Concurrency
  - Multiple users must be able to operate on different workspaces concurrently.
  - Multiple sessions must be able to exist concurrently for the same workspace.
  - Session execution must be isolated such that one session cannot corrupt another session’s working state.
- Governance
  - Document sandbox assumptions (Docker isolation)
  - Provide retention strategy placeholder for workspaces and transcripts

## 8. API and data model (v0.2.0 additions)

### 8.1 Backend API additions

- `POST /api/workspaces/import`
- `GET /api/workspaces`
- `POST /api/sessions` extends to accept `{ workspace_id, runner_type }`

### 8.2 Persistence entities (minimum)

- `workspaces`
- `sessions`
- `runs`
- `run_events` (or JSONL transcript blob)
- `messages` (v0.2.4 - chat conversation persistence)

## 9. Delivery plan (implementation sequence)

- Phase 0: Add persistence primitives and workspace registry
- Phase 1: Add runner routing abstraction in backend
- Phase 2: Implement Claude runner service and docker-compose wiring
- Phase 3: Frontend UI uplift (workspace import + dropdown + runner selection)
- Phase 4: Chat transcript UI + raw logs view + run reload
- Phase 5: Add microservices placeholders and minimal integration
- Phase 6: Enterprise Chat UI with message persistence (v0.2.4)
