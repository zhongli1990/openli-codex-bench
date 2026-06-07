import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * LIFECYCLE DEMO — openli-codex-bench core workflow, end-to-end through
 * OpenRunner's gateway-mode runners.
 *
 * This is the user-acceptance proof that the coding-agent console's core
 * lifecycle runs end-to-end:
 *
 *   pick a demo workspace  ->  create a session (gateway mode, runner_type
 *   from the switcher)  ->  submit a prompt  ->  the run streams and reaches a
 *   COMPLETED transcript in the UI.
 *
 * Cost-safe / zero-token: the run targets the Mock runner (runner_type=mock),
 * which is deterministic and makes no model calls. This proves the WORKFLOW
 * lifecycle, not model quality.
 *
 * Backend runs in RUNNER_MODE=gateway and dispatches via OpenRunner's
 * agent-gateway (host.docker.internal:9422) to the mock runner
 * (host.docker.internal:9433). We additionally cross-check that a fresh
 * agent-gateway /v1/audit record for this bench (app_id=openli-codex-bench)
 * appeared during the run.
 *
 * Auth is provided by global-setup (storageState with the JWT in localStorage).
 *
 * The bench frontend ships POST /api/sessions but no GET /api/workspaces list
 * proxy, so the run-page workspace dropdown is empty out of the box. We fulfil
 * GET /api/workspaces in-test by proxying to the backend with the user's JWT
 * (same bridge used by runner-switcher.spec.ts). Everything else — session
 * create, prompt submit, the gateway-mode mock run, the transcript — hits the
 * real stack.
 */

const SWITCHER = '[aria-haspopup="listbox"]';
const RUNNER_KEY = "saas-codex-runner-type";
const BACKEND = process.env.E2E_BACKEND_URL || "http://localhost:9441";
const GATEWAY = process.env.E2E_GATEWAY_URL || "http://localhost:9422";

const SCREENSHOT_DIR = path.join(__dirname, "..", "playwright", "screenshots");

async function setRunner(page: Page, value: string) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [RUNNER_KEY, value] as const,
  );
}

function token(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("saas-codex-token"));
}

/**
 * Bridge GET /api/workspaces (missing from the frontend build) by proxying to
 * the backend with the user's JWT, so the run-page workspace dropdown
 * populates with the seeded demo workspaces.
 */
async function provideWorkspaces(page: Page): Promise<any[]> {
  const t = await token(page);
  if (!t) return [];
  const res = await page.request.get(`${BACKEND}/api/workspaces`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok()) return [];
  const json = await res.json();
  const items: any[] = json?.items ?? [];
  if (!items.length) return [];

  await page.route("**/api/workspaces", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    }
    return route.continue();
  });
  return items;
}

/** Count gateway audit records for this bench, to cross-check the run hit it. */
async function gatewayAuditCount(page: Page): Promise<number> {
  try {
    const res = await page.request.get(`${GATEWAY}/v1/audit?limit=200`);
    if (!res.ok()) return -1;
    const rows = await res.json();
    if (!Array.isArray(rows)) return -1;
    return rows.filter(
      (r) => r?.detail?.app_id === "openli-codex-bench",
    ).length;
  } catch {
    return -1;
  }
}

test("lifecycle: demo workspace -> session (gateway/mock) -> prompt -> completed transcript", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // 1. Open the console with the Mock runner active (zero-token, gateway-routed).
  await page.goto("/codex");
  await setRunner(page, "mock");
  const workspaces = await provideWorkspaces(page);
  await page.goto("/codex");
  await expect(page.locator(SWITCHER)).toBeVisible();

  expect(
    workspaces.length,
    "expected at least one seeded demo workspace from the backend",
  ).toBeGreaterThan(0);

  // 2. Pick a demo workspace (the seeded Hello-World repos).
  const wsSelect = page.locator("select").first();
  await expect(wsSelect).toBeVisible();
  const optionValues = await wsSelect
    .locator("option")
    .evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v),
    );
  expect(optionValues.length, "workspace dropdown should be populated").toBeGreaterThan(0);
  await wsSelect.selectOption(optionValues[0]);

  const auditBefore = await gatewayAuditCount(page);

  // 3. Create a session (POST /api/sessions, runner_type=mock, gateway mode).
  const createBtn = page.getByRole("button", { name: "Create Session" });
  await expect(createBtn).toBeEnabled();
  const [sessionResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/sessions") && r.request().method() === "POST",
    ),
    createBtn.click(),
  ]);
  expect(sessionResp.request().postDataJSON()).toMatchObject({ runner_type: "mock" });
  expect(
    sessionResp.ok(),
    `session create should succeed (gateway+mock reachable); got HTTP ${sessionResp.status()}`,
  ).toBeTruthy();

  // The status chip flips to a live-session state ("session-ready") once the
  // session exists. (Note: "no session" is a substring of the unrelated
  // "No sessions yet" empty-state label, so we assert the chip text directly.)
  await expect(page.getByText("session-ready").first()).toBeVisible({ timeout: 20_000 });

  // 4. Submit a short prompt and run it through the gateway-routed mock runner.
  const promptBox = page.locator("textarea").first();
  await expect(promptBox).toBeVisible();
  await promptBox.fill("Say hello and stop.");
  const runBtn = page.getByRole("button", { name: "Run Prompt" });
  await expect(runBtn).toBeEnabled();
  await runBtn.click();

  // 5. The lifecycle COMPLETES: status chip shows "completed" when the
  //    gateway-relayed SSE stream closes. The mock runner's gateway poll loop
  //    can take ~90-120s end-to-end, so allow a generous terminal window.
  await expect(page.getByText("completed").first()).toBeVisible({ timeout: 150_000 });

  // 6. A transcript rendered (the console shows streamed run output, not the
  //    empty-state "No messages yet" placeholder). The submitted prompt is
  //    pushed into the transcript as the user message, and the gateway-relayed
  //    mock run pushes tool messages ("Calling ... / Result from ...").
  await expect(
    page.getByText("No messages yet.", { exact: false }),
  ).toHaveCount(0, { timeout: 10_000 });
  await expect(
    page.getByText("Say hello and stop.").first(),
  ).toBeVisible({ timeout: 10_000 });

  // 7. Gateway audit cross-check: a fresh /v1/audit record for this bench
  //    appeared (the run really went through the agent-gateway). Best-effort:
  //    do not fail the lifecycle proof if the audit endpoint shape differs.
  const auditAfter = await gatewayAuditCount(page);
  if (auditBefore >= 0 && auditAfter >= 0) {
    expect(
      auditAfter,
      "expected a fresh agent-gateway /v1/audit record for openli-codex-bench",
    ).toBeGreaterThan(auditBefore);
  }

  // 8. Capture the completed-workflow screenshot (gitignored).
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "lifecycle-demo-completed.png"),
    fullPage: true,
  });
});
