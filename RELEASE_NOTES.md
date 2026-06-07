# fleet-bench — Release Notes

## v0.3.1 (2026-06-07) — R5 complete: full platform-swap proof
fleet-bench is now the **canonical clean-swap proof** for the OpenRunner platform. R5 gates:
- **G1 Phase-0 regression suites** (the uplifted runners, previously 0 tests): runner-openai-codex
  **10/10** (SDK-0.137 event mapping) · runner-claude **18/18** (claude-agent-sdk mapping + dual-auth).
- **G2 cross-runner parity + Bradford acceptance** — zero-token, all 4 complete.
- **Shared workspace volume** (HIGH blocker resolved) — backend mounts the SAME dir the runners use
  (`${SHARED_WORKSPACES:-../openrunner/workspaces}`); content-level cases proven through the backend in
  both modes (runner globbed the cloned files + read `.git/HEAD`).
- **Backend-routed 4-runner matrix** (`tests/runner_matrix.py` → `tests/regression_report.json`):
  **8/8** cells (codex/claude/opencodex/mock × raw/gateway) complete; every gateway cell carries a
  `/v1/audit` record (the platform owns selection/registry/audit/cost).
- **G3 frontend quality** + **G4 Playwright UI e2e** — booted live, **12 passed / 1 documented skip**.
- **Gateway identity headers** — `X-OpenRunner-Tenant/App/User` (attribution real for R6+).
- **G7 AWS readiness** — `docker-compose.aws.yml` (API-key-only, no subscription auth), `.env.aws.example`,
  `DEPLOY_AWS.md`; deploy config valid; mock-safe dry-run boot.
- **Known local-dev fragility:** the backend reaches raw runner ports via `host.docker.internal`, which
  can momentarily refuse during runner recreation; **gateway mode + in-VPC DNS (the AWS path) avoids it.**

Tag **v0.3.1**. Next: **R6 — OpenBid + OpenSOP** (do NOT start ASOS until both have gateway-mode
regression reports).



fleet-bench is a benchmark rig, not a shipped product — "releases" mark harness milestones.
(The previous `docs/` tree was inherited verbatim from the cloned `saas-codex` product and has been
removed; those docs live in the `saas-codex` repo. fleet-bench's docs are `README.md` + `FLEET_BENCH.md`.)

## v0.3.0 (2026-06-07) — Consolidated onto OpenRunner + 4-runner switchable UI
- **Legacy embedded runners removed** — deleted `runner/` (codex-sdk 0.84) + `claude-runner/`
  (claude-agent-sdk 0.1.30) + their compose services. **Every `runner_type` now routes to OpenRunner's
  consolidated runners** (host 9430–9433) over the identical protocol — no adapter, no fork. fleet-bench
  is the first pure consumer of the OpenLI OpenRunner services. Proven: codex/claude/opencodex sessions
  create a thread on OpenRunner.
- **4-runner switchable UI** — single source of truth (`frontend/src/lib/runners.ts`). 4 **live**
  runners (opencodex[default]/codex/claude/mock) each send their own `runner_type`; 4 **placeholder**
  runners (gemini/azure/bedrock/custom) are mock-backed with a "to be activated" warning + Soon badge.
  Switchable anytime from the **top-bar switcher** AND **Settings** (now wired to AppContext — was a
  dead setting), consistent across codex/chat/projects/dashboard. Peer-reviewed: 7/7 release invariants
  PASS; `tsc` clean.
- **Gateway/facade mode (platform swap) — implemented + proven.** New `RUNNER_MODE` env: `raw`
  (default; backend → runner ports 9430-9433, for harness/debug) or `gateway` (backend → OpenRunner
  **agent-gateway** `:9422` `/v1/threads`+`/v1/runs`+`/v1/events` with a `runner` field). In gateway
  mode OpenRunner owns selection/registry/audit/cost — verified: a run created a gateway `/v1/audit`
  `sandbox.acquired {runner: opencodex, base_url: runner-opencodex:8083}` record that only the gateway
  path produces. Clean `RunnerEndpoint` abstraction; raw mode unchanged. (codex→openai-codex name-mapped
  for the gateway registry.) No service token needed in the capability_lab profile.
- **QA gates** (`openrunner/docs/25` §6 · roadmap `docs/26`): G1 unit · G2 cross-runner parity +
  Bradford acceptance (zero-token) ✅ · G3 frontend quality ✅ · raw+gateway routing ✅. Pending for full
  R5 sign-off: G4 Playwright UI e2e · G5 shared-workspace regression report · G7 AWS readiness.
- **App ladder updated** (reviewer): fleet-bench → openbid + opensop → ASOS → OpenTax → rest.

## v0.2.0 (2026-06-07) — Real 3-agent benchmark on a real estate
- **Runner-protocol + body-shape parity VALIDATED** — saas-codex's `/threads`+`/runs`+`/events` shapes
  drive OpenRunner's runners with **no adapter**.
- **Product-backend swap PROVEN** — a real session through the cloned backend with
  `runner_type=opencodex` created a thread + run on OpenRunner's runner end-to-end.
- **Bradford NHS estate 3-agent comparison** (OpenCodex/gpt-4o · OpenAI-Codex/gpt-5.5 ·
  Claude/Opus-4.8) — all three real agents produced correct, grounded analyses; quantified on
  process (tools/steps/latency/tokens) + outcome. Reports in `openrunner/tests/fleet-bench/`.
- **Docs reset** — removed the inherited saas-codex product docs; README rewritten to fleet-bench's
  real identity (swap harness + agent benchmark).

## v0.1.0 (2026-06-05) — Clone + swap wiring
- Physical clone of `saas-codex`, ports re-ranged to 9440–9459, runner-swap routing wired
  (`backend/_get_runner_url` → OpenRunner runners by `runner_type`). Compose validated; swap targets up.

## Next
- Shared workspace volume for content-level cases through the product backend.
- Full backend-routed runner matrix (codex/claude/opencodex/mock, distinct workspaces) + Playwright smoke.
- ASOS PO-triage clone (machine-checkable golds) per the app ladder in `FLEET_BENCH.md`.
