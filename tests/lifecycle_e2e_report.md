# openli-codex-bench — Lifecycle E2E Report

**Verdict: lifecycle E2E for openli-codex-bench: PASS**

## Workflow exercised (the real core lifecycle)

The coding-agent console's user-acceptance lifecycle, driven through the UI,
authenticated, with runs routed through OpenRunner's **gateway-mode** runners:

1. Pick a seeded **demo workspace** (the `*/Hello-World` GitHub repos seeded in
   the bench DB).
2. **Create a session** via `POST /api/sessions` with `runner_type=mock`
   (selected from the runner switcher; backend `RUNNER_MODE=gateway`).
3. **Submit a prompt** (`"Say hello and stop."`) via the run panel.
4. The run **streams and reaches a terminal `completed` state**, and the
   **transcript renders** in the console (user message + gateway-relayed mock
   tool events), not the empty-state placeholder.

This is cost-safe / zero-token: the **Mock runner** is deterministic and makes
no model calls. It proves the WORKFLOW lifecycle, not model quality.

## Demo data used

- Backend-seeded workspaces (`GET /api/workspaces` → several `Hello-World`
  GitHub repos). The frontend ships no `/api/workspaces` list proxy, so the test
  bridges that one GET by proxying to the backend with the user's JWT (test-only
  route fulfilment; identical to the existing `runner-switcher.spec.ts`
  pattern). Session-create, prompt-submit, the mock run, and the transcript all
  hit the real stack.

## Gateway-mode path (verified live)

- Backend env: `RUNNER_MODE=gateway`, `OPENRUNNER_GATEWAY_URL=http://host.docker.internal:9422`.
- During an API dry-run the agent-gateway logged
  `POST /v1/threads 201` → `POST /v1/runs 202` → run `completed` (lastSeq 25),
  dispatched to the mock runner (`base_url http://runner-mock:8084`).
- **Note:** a stale comment in `runner-switcher.spec.ts`'s smoke test claimed the
  backend could not reach the runners (`host.docker.internal:9433`). That is no
  longer true — the backend reaches both the gateway (`:9422`, HTTP 200) and the
  mock runner (`:9433`, HTTP 200), and the full run completes end-to-end.

## Gateway audit cross-check

`GET http://localhost:9422/v1/audit` shows fresh records for this run with
`detail.app_id == "openli-codex-bench"` (e.g. `memory_context.loaded` and
`sandbox.acquired` with `runner: mock`, `run_id: 892a14b6…`). The spec asserts
the per-bench audit count increased across the run (best-effort: it does not
fail the lifecycle proof if the audit shape differs).

## Result

- Spec: `frontend/e2e/lifecycle-demo.spec.ts`
- Command: `npx playwright test e2e/lifecycle-demo.spec.ts`
- **PASS** (1 passed).
- Completed-lifecycle assertion: status chip reaches **`completed`** and the
  transcript renders the submitted prompt (empty-state absent).
- Screenshot (gitignored): `frontend/playwright/screenshots/lifecycle-demo-completed.png`

## Scope / constraints honoured

- Zero-token (mock runner only). No backend / OpenRunner / runner-wiring changes.
- New files only: `frontend/e2e/lifecycle-demo.spec.ts`, this report, and a
  `.gitignore` line for `frontend/playwright/screenshots/`. No secrets committed.
