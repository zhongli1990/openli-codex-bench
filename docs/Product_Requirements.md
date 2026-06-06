# Product Requirements (saas-codex)

## 1. Product overview

saas-codex is a SaaS platform for **agentic AI-driven analysis and implementation** of healthcare integrations.

Next release planning:
- [archive/Product_Requirements_v0.2.0_Archive.md](archive/Product_Requirements_v0.2.0_Archive.md)
- [File_Management_Requirements.md](File_Management_Requirements.md)

Primary goals:
- Provide a safe, repeatable workflow to analyze integration codebases (HL7 v2, FHIR, X12, proprietary APIs).
- Automate implementation tasks (code changes, scaffolding, validation, documentation) with human-in-the-loop control.
- Centralize governance for security, auditability, and tenant separation.

## 2. Personas

- Integration engineer
  - Needs fast analysis of unfamiliar integration repos and reliable change proposals.
- Solution architect
  - Needs structured summaries, impact analysis, and design artifacts.
- Engineering manager / compliance
  - Needs audit logs, repeatable runs, and policy controls.

## 3. Scope: current MVP (implemented today)

### 3.1 Repository session
- User provides a **public git repository URL**.
- System clones the repository into a workspace directory.
- System creates an agent thread bound to that workspace.

Acceptance criteria:
- Given a valid `repo_url`, a session can be created and the repo is cloned.

### 3.2 Prompt execution
- User provides a prompt.
- System runs an agent turn against the workspace and streams structured events.

Acceptance criteria:
- A prompt run emits an SSE stream containing:
  - run/thread lifecycle events
  - tool execution events
  - agent messages

### 3.3 Web UI workflow
- A "Codex" page supports:
  - Enter repo URL
  - Create session
  - Enter prompt
  - Run prompt
  - View streamed events

Acceptance criteria:
- From the browser, a user can complete the above workflow end-to-end.

## 4. SaaS requirements (near-term roadmap)

### 4.1 Multi-tenant & authentication
- Tenant (org/team) context must scope all resources.
- Support modern auth (OIDC / SSO) and API keys.

### 4.2 Project and session management
- Projects represent integration repos and metadata (client, interface type, environments).
- Sessions represent point-in-time workspace snapshots.
- Run history and replay.

### 4.3 Healthcare integration domain features
- FHIR
  - Resource-level change impact reporting
  - CapabilityStatement analysis
- HL7 v2
  - Message mapping analysis
  - Segment/field coverage reports
- X12
  - Transaction set validation summaries
- InterSystems IRIS / HealthShare
  - Production config analysis (where available)
  - ObjectScript / interoperability artifacts summarization

### 4.4 Safety and governance
- Workspace isolation and retention policy.
- Policy controls for:
  - file write scope
  - command execution scope
  - network access
- Audit log of runs, prompts, tool calls, and file diffs.

### 4.5 Deployment and operations
- Containerized deployment (compose today; Kubernetes later).
- Observability:
  - structured logs
  - metrics
  - tracing (optional)

## 5. Non-functional requirements

- Security
  - No secrets committed to source control.
  - Tenant isolation.
- Reliability
  - Streaming should tolerate transient disconnects.
- Performance
  - Repo clone and first event within acceptable latency for small repos.
- Compliance readiness
  - Preserve run transcripts and diffs with retention controls.

## 6. Out of scope (for now)

- Private repo access (requires credential management).
- Fine-grained RBAC.
- Production-grade billing.
- Long-running job queue / scheduling.
