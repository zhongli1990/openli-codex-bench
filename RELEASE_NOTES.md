# fleet-bench — Release Notes

fleet-bench is a benchmark rig, not a shipped product — "releases" mark harness milestones.
(The previous `docs/` tree was inherited verbatim from the cloned `saas-codex` product and has been
removed; those docs live in the `saas-codex` repo. fleet-bench's docs are `README.md` + `FLEET_BENCH.md`.)

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
