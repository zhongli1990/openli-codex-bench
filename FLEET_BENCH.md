# fleet-bench — Fleet Runner Swap Harness & Like-for-Like Agent Benchmark

A **physical clone of saas-codex** (its own ports/DB/compose project) used to run the **same cases**
against multiple agent runners and compare **like-for-like**: OpenCodex (new) vs OpenAI-Codex
(existing) vs Claude (existing) vs Mock — same prompt, same workspace/app/session, same expected
output, normalized event transcript.

**Why this is the real parity proof:** not "OpenCodex feels good," but *same inputs → same golds →
compare trace/quality/efficiency*. It works because saas-codex's backend already routes by
`runner_type` over `/threads` + `/runs` + `/runs/{id}/events` — the **same protocol OpenRunner's
runners speak**, so runners swap by config, no adapter.

## Ports (9440–9459, distinct from saas-codex 9100s)
fe 9440 · be 9441 · codex 9442 · pg 9443 · claude 9444 · prompt 9445 · eval 9446 · memory 9447 · llm-gw 9448

## Runner routing (`backend/_get_runner_url`)
| runner_type | URL (default) | source |
|---|---|---|
| `codex` | `http://runner:8081` (embedded) | clone's own |
| `claude` | `http://claude-runner:8082` (embedded) | clone's own |
| `opencodex` | `http://host.docker.internal:9432` | **OpenRunner** (new) |
| `mock` | `http://host.docker.internal:9433` | **OpenRunner** mock (zero-token) |
All overridable via env (`RUNNER_*_URL`).

## Phased swap (per the review)
- **Phase A — baseline:** boot fleet-bench with its own `codex` + `claude` runners; run the case set
  → record transcripts/timings (the embedded-runner baseline).
- **Phase B — swap-in canary:** run the SAME cases with `runner_type=opencodex` → routes to
  OpenRunner's runner (9432). Like-for-like perf + transcript diff vs Phase A.
- **Phase C — full swap:** repoint `codex→9430` / `claude→9431` / add `mock→9433` (OpenRunner
  runners), disable the clone's embedded runner dockers (`docker compose up --scale runner=0 --scale
  claude-runner=0`), and run everything against OpenRunner.

## Run
```bash
# OpenRunner runners must be up (host 9430-9433) — they are the swap targets.
cd fleet-bench
docker compose up -d postgres backend frontend          # Phase A core (+ runner/claude-runner)
# Phase B/C: drive the case set with runner_type ∈ {codex, claude, opencodex, mock}
#   POST :9441/api/... with runner_type=opencodex  → OpenRunner's opencodex runner
```

## Benchmark records (the parity scorecard)
Per case × runner: wall time, steps, tool calls, tokens, vision/web/mcp calls, **normalized event
transcript**, tool-call assertions, citations/guardrails, expected-output match. Stored as JSON for
trend + side-by-side. (Reuses OpenRunner's `tests/efficiency/bench.py` metric shape.)

## App ladder (per the review)
1. **fleet-bench (this)** — runner swap canary: proves OpenRunner replaces the old runner path
   without breaking product UX (session/streaming/workspace/transcript).
2. **ASOS PO-triage** — best machine-checkable bench (frozen golds, structured outputs, citations,
   action enums, guardrails).
3. **OpenTax** — flagship: regulated workflow, documents, calculations, validate-before-submit, audit.

## Controlled like-for-like swap procedure (the methodology — applies to every cloned app)
1. **Physically clone** the app → rename → re-range ports (non-destructive; new compose project).
2. **Baseline (Phase A):** boot with the app's OWN runners; run the annotated case set → record
   transcripts/outputs/timings (the control).
3. **Single-swap (Phase B):** flip ONE `runner_type` to an OpenRunner runner (env only); re-run the
   SAME cases; diff transcript/output/latency vs baseline. Change one variable at a time.
4. **Full-swap (Phase C):** repoint all runner_types to OpenRunner; disable the app's own runner
   dockers; re-run; emit the parity report.
5. Never mutate the original app. Each step is reversible by env.

## Runner-protocol parity — VALIDATED (de-risks Phase 2)
saas-codex's exact request shapes were sent to OpenRunner's opencodex runner (host 9432):
- `POST /threads {workingDirectory, skipGitRepoCheck}` → `{threadId}` ✓
- `POST /runs {threadId, prompt}` → `{runId, status}` ✓
- `GET /runs/{id}/events` (SSE) → event stream ✓
So the swap is **protocol- AND body-compatible** — no adapter needed. The remaining Phase-2 work is
booting the app stack + scoring outputs, not protocol plumbing.

## App ladder (per review) — clone-rename-swap each
1. **saas-codex → fleet-bench** (this): swap canary (protocol/SSE/transcript/UI compatibility).
2. **ASOS PO-triage → (clone)**: first machine-checkable capability benchmark (frozen golds,
   structured outputs, citations, action enums, guardrails).
3. **OpenTax/OpenCT → (clone)**: flagship regulated-SaaS proof (documents, calculations,
   validate-before-submit, audit, tool discipline).

## Status
- **Phase 1 DONE:** clone + re-range + runner-swap wiring + compose validated; swap targets UP;
  **runner-protocol + body-shape parity VALIDATED** (saas-codex shapes → OpenRunner opencodex runner).
- **Phase 2 — product-backend swap PROVEN:** booted postgres + backend (heavy runner/frontend builds
  skipped); extended `RunnerType` Literal with `opencodex`/`mock`; drove a real session **through the
  product backend** with `runner_type=opencodex` → `POST /api/sessions` 200 returned a `thread_id`
  **from OpenRunner's opencodex runner** (host 9432), `POST /api/sessions/{id}/prompt` 200 returned a
  `run_id`, run executed. The backend container reaches the runner via `host.docker.internal:9432`.
  Cross-runner **runner-level parity** is in `openrunner/tests/fleet-bench/parity_report.py`
  (4 runners × 3 cases, 12/12 completed).
- **Phase 2 remaining (honest):**
  - **Workspace volume sharing** — fleet-bench's backend and OpenRunner's runner do NOT share the
    `/workspaces` mount, so the runner sees the working dir but not the cloned content. For a real
    swap the runner must mount the same workspace volume (or be co-located). Lifecycle parity holds
    regardless; content-level cases need the shared volume.
  - **mock/codex/claude backend matrix** — drive the same cases per runner with DISTINCT workspaces
    (the `uq_workspace_source` constraint rejects reusing one repo_url); emit the full parity report
    with transcript links + latency + citations.
  - **Frontend + Playwright** — boot the Next portal and run `frontend/e2e` against it.
