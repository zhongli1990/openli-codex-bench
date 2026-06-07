# OpenLi Codex (openli-codex-bench) — Runner Swap Harness & Like-for-Like Agent Benchmark

> Renamed from `fleet-bench` → `openli-codex-bench` (rebranded to **OpenLi Codex**). The swap
> methodology below is unchanged.

A **physical clone of saas-codex** (its own ports/DB/compose project) used to run the **same cases**
against multiple agent runners and compare **like-for-like**: OpenCodex (new) vs OpenAI-Codex
(existing) vs Claude (existing) vs Mock — same prompt, same workspace/app/session, same expected
output, normalized event transcript.

**Why this is the real parity proof:** not "OpenCodex feels good," but *same inputs → same golds →
compare trace/quality/efficiency*. It works because saas-codex's backend already routes by
`runner_type` over `/threads` + `/runs` + `/runs/{id}/events` — the **same protocol OpenRunner's
runners speak**, so runners swap by config, no adapter.

## Ports (9440–9459, distinct from saas-codex 9100s)
fe 9440 · be 9441 · codex 9442 · pg 9443 · claude 9444 · prompt 9445 · eval 9446 · llm-gw 9448
(9447 was the legacy `memory` service — removed; these benches use OpenRunner's shared services only.)

## Runner routing (`backend/_get_runner_url`)
| runner_type | URL (default) | source |
|---|---|---|
| `codex` | `http://host.docker.internal:9430` | **OpenRunner** openai-codex |
| `claude` | `http://host.docker.internal:9431` | **OpenRunner** claude |
| `opencodex` | `http://host.docker.internal:9432` | **OpenRunner** opencodex |
| `mock` | `http://host.docker.internal:9433` | **OpenRunner** mock (zero-token) |
All overridable via env (`RUNNER_*_URL`). **openli-codex-bench has NO embedded runners** — the legacy
`runner`/`claude-runner` were removed; every `runner_type` is served by OpenRunner's consolidated
runners (proven: codex/claude/opencodex sessions all create a thread on OpenRunner).

## Canonical "how to swap an app" template (R5-proven)
openli-codex-bench is the **reference implementation** for swapping any fleet app onto OpenRunner. The proven,
reusable recipe (full per-app checklist in `openrunner/docs/26` §4):
1. Remove the app's embedded runners; route every `runner_type` to OpenRunner.
2. **Shared workspace** — mount the SAME host dir the OpenRunner runners use (so content-level cases work).
3. **Two modes** — `RUNNER_MODE=raw` (runner ports, harness/debug) vs `gateway` (agent-gateway `:9422`
   `/v1/*` with a `runner` field + `X-OpenRunner-Tenant/App/User` — the **product proof**).
4. **Backend-routed matrix** over `{codex,claude,opencodex,mock} × {raw,gateway}` → committed
   `tests/regression_report.json`; require all complete + gateway cells carry a `/v1/audit` record.
5. **Playwright UI e2e** for the runner selector; **AWS readiness** (API-key-only `docker-compose.aws.yml`).
6. Deprecate (don't delete) the embedded runner dirs; keep it reversible by env.

## Swap status (v0.3.1 — R5 complete)
openli-codex-bench is **already fully swapped** — it has **no embedded runners**; every `runner_type` is
served by OpenRunner's consolidated runners. The phased baseline-vs-candidate methodology below is the
**general procedure for the OTHER upstream apps** (openbid, opensop, ASOS, OpenTax …) whose embedded
runners are still being swapped out. For a openli-codex-bench regression baseline, pin a tagged old-runner
image rather than re-embedding it.

- **Phase A — baseline (per app being swapped):** boot the app with its OWN embedded runners; run the
  case set → record transcripts/timings (the embedded-runner baseline).
- **Phase B — swap-in canary:** run the SAME cases routed to OpenRunner (raw runner port, or the
  gateway facade). Like-for-like perf + transcript diff vs Phase A.
- **Phase C — full swap:** route all `runner_type`s to OpenRunner; deprecate (don't delete) the app's
  embedded runner dirs.

## Routing modes (R5)
- **raw runner mode** (harness/debug) — `RUNNER_*_URL` → OpenRunner runner ports `9430-9433` (current).
- **gateway/facade mode** (product proof) — `RUNNER_*_URL` → OpenRunner **agent-gateway** (`:9422`,
  `/v1/threads`+`/v1/runs`+`/v1/events`), so OpenRunner owns runner selection, registry, audit, cost,
  auth, and policy. This is the true *platform* swap.

## Run
```bash
# OpenRunner runners (and, for gateway mode, the agent-gateway) must be up.
cd openli-codex-bench
docker compose up -d postgres backend frontend          # no embedded runners; runners served by OpenRunner
# drive the case set with runner_type ∈ {codex, claude, opencodex, mock}
#   POST :9441/api/sessions {runner_type, repo_url}  → OpenRunner
```

## Benchmark records (the parity scorecard)
Per case × runner: wall time, steps, tool calls, tokens, vision/web/mcp calls, **normalized event
transcript**, tool-call assertions, citations/guardrails, expected-output match. Stored as JSON for
trend + side-by-side. (Reuses OpenRunner's `tests/efficiency/bench.py` metric shape.)

## App ladder (reviewer-aligned)
**openli-codex-bench → openbid + opensop → ASOS → OpenTax → rest of fleet** (gsj, opentrials, HIE, saas-codex).
openbid (proposal/knowledge) + opensop (SOP/document) come before ASOS because they're closest to the
saas-codex runner pattern and stress OpenCodex's differentiators (memory, web/MCP, document
intelligence, subagents); ASOS is then the objective machine-checkable gold gate before the OpenTax
flagship. Full plan + QA gates: `openrunner/docs/25`.

1. **openli-codex-bench (this)** — runner swap canary: proves OpenRunner replaces the old runner path
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
1. **saas-codex → openli-codex-bench** (this): swap canary (protocol/SSE/transcript/UI compatibility).
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
  Cross-runner **runner-level parity** is in `openrunner/tests/openli-codex-bench/parity_report.py`
  (4 runners × 3 cases, 12/12 completed).
- **Phase 2 remaining (honest):**
  - **Workspace volume sharing** — openli-codex-bench's backend and OpenRunner's runner do NOT share the
    `/workspaces` mount, so the runner sees the working dir but not the cloned content. For a real
    swap the runner must mount the same workspace volume (or be co-located). Lifecycle parity holds
    regardless; content-level cases need the shared volume.
  - **mock/codex/claude backend matrix** — drive the same cases per runner with DISTINCT workspaces
    (the `uq_workspace_source` constraint rejects reusing one repo_url); emit the full parity report
    with transcript links + latency + citations.
  - **Frontend + Playwright** — boot the Next portal and run `frontend/e2e` against it.
