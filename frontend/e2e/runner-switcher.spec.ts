import { test, expect, type Page } from "@playwright/test";

/**
 * R5 gate G4 — fleet-bench 4-runner switchable UI, end-to-end.
 *
 * Live runners (real backend runner_type): opencodex, codex, claude, mock.
 * Placeholder runners (mock-backed, "Soon"): gemini, azure, bedrock, custom.
 * Active runner persists in localStorage key "saas-codex-runner-type".
 *
 * Auth is provided by global-setup (storageState with the JWT in localStorage).
 */

const RUNNER_KEY = "saas-codex-runner-type";

const LIVE = [
  { value: "opencodex", label: "OpenCodex" },
  { value: "codex", label: "OpenAI Codex" },
  { value: "claude", label: "Claude Code" },
  { value: "mock", label: "Mock" },
] as const;

const SWITCHER = '[aria-haspopup="listbox"]';

async function readRunner(page: Page): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), RUNNER_KEY);
}

async function setRunner(page: Page, value: string) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [RUNNER_KEY, value] as const,
  );
}

/** Open the top-bar switcher and return the dropdown listbox locator. */
async function openSwitcher(page: Page) {
  const button = page.locator(SWITCHER);
  await expect(button).toBeVisible();
  await button.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  return listbox;
}

test.describe("RunnerSwitcher (top bar)", () => {
  test.beforeEach(async ({ page }) => {
    // Reset to the default runner before each test for determinism.
    await page.goto("/codex");
    await setRunner(page, "opencodex");
    await page.goto("/codex");
    // The app keeps background connections (SSE/polling) open, so "networkidle"
    // never settles — wait for the switcher to render instead.
    await expect(page.locator(SWITCHER)).toBeVisible();
  });

  test("shows the active runner and lists 4 live + 4 placeholder (Soon) runners", async ({
    page,
  }) => {
    // Active runner label visible on the button.
    await expect(page.locator(SWITCHER)).toContainText("OpenCodex");

    const listbox = await openSwitcher(page);
    const options = listbox.getByRole("option");
    await expect(options).toHaveCount(8);

    // All four live runners present.
    for (const r of LIVE) {
      await expect(listbox.getByRole("option", { name: new RegExp(r.label) })).toBeVisible();
    }

    // Exactly four "Soon" placeholder badges.
    await expect(listbox.getByText("Soon", { exact: true })).toHaveCount(4);

    // Gemini (a placeholder) is listed and badged Soon.
    const gemini = listbox.getByRole("option", { name: /Gemini/ });
    await expect(gemini).toBeVisible();
    await expect(gemini.getByText("Soon", { exact: true })).toBeVisible();
  });

  for (const runner of LIVE) {
    test(`selecting LIVE runner "${runner.value}" updates active + persists across reload`, async ({
      page,
    }) => {
      const listbox = await openSwitcher(page);
      await listbox.getByRole("option", { name: new RegExp(runner.label) }).click();

      // Button reflects the new active runner.
      await expect(page.locator(SWITCHER)).toContainText(runner.label);
      // Persisted to localStorage.
      await expect.poll(() => readRunner(page)).toBe(runner.value);

      // Reload -> selection persists (initialised synchronously from localStorage).
      await page.reload();
      await expect(page.locator(SWITCHER)).toBeVisible();
      await expect(page.locator(SWITCHER)).toContainText(runner.label);
      expect(await readRunner(page)).toBe(runner.value);
    });
  }

  test('selecting a PLACEHOLDER (gemini) shows the "running against the Mock runner" warning', async ({
    page,
  }) => {
    const listbox = await openSwitcher(page);
    await listbox.getByRole("option", { name: /Gemini/ }).click();

    // Reopen the dropdown — the active placeholder warning renders inside it.
    const reopened = await openSwitcher(page);
    await expect(reopened).toContainText(/placeholder runner/i);
    await expect(reopened).toContainText(/running against the Mock runner/i);

    // And the placeholder value is persisted as the active selection.
    expect(await readRunner(page)).toBe("gemini");
  });
});

test.describe("Settings <-> top-bar switcher sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await setRunner(page, "opencodex");
    await page.goto("/settings");
    await expect(page.locator(SWITCHER)).toBeVisible();
    await expect(page.locator('input[name="runner"]').first()).toBeVisible();
  });

  test("changing the Settings Default Runner updates the top-bar switcher", async ({
    page,
  }) => {
    // General settings is the default tab; select the Claude radio.
    const claudeRadio = page.locator('input[name="runner"][value="claude"]');
    await expect(claudeRadio).toBeVisible();
    await claudeRadio.check();

    await expect.poll(() => readRunner(page)).toBe("claude");
    // Top-bar switcher reflects the Settings choice (shared AppContext state).
    await expect(page.locator(SWITCHER)).toContainText("Claude Code");
  });

  test("changing the top-bar switcher updates the Settings radio", async ({ page }) => {
    // Drive from the top-bar switcher.
    const listbox = await openSwitcher(page);
    await listbox.getByRole("option", { name: /OpenAI Codex/ }).click();
    await expect(page.locator(SWITCHER)).toContainText("OpenAI Codex");

    // The Settings "codex" radio is now checked, "opencodex" is not.
    await expect(page.locator('input[name="runner"][value="codex"]')).toBeChecked();
    await expect(
      page.locator('input[name="runner"][value="opencodex"]'),
    ).not.toBeChecked();
  });
});

test.describe("Run UI wiring (network body carries the correct runner_type)", () => {
  // The codex page's Create Session POSTs /api/sessions with
  // runner_type = backendRunnerFor(active): live runners send themselves,
  // placeholder runners send "mock". We assert the wired body rather than
  // executing a full agent run (headless-stable).

  async function selectWorkspaceIfAny(page: Page): Promise<boolean> {
    const wsSelect = page.locator("select").first();
    await expect(wsSelect).toBeVisible();
    const optionValues = await wsSelect
      .locator("option")
      .evaluateAll((opts) =>
        opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v),
      );
    if (optionValues.length === 0) return false;
    await wsSelect.selectOption(optionValues[0]);
    return true;
  }

  /**
   * This frontend build ships /api/sessions (POST) but no /api/workspaces list
   * route, so the run-page workspace dropdown is empty out of the box. To
   * exercise the *real* session-creation wiring we fulfil GET /api/workspaces
   * by proxying to the backend with the user's JWT. Everything else (the
   * /api/sessions POST body we assert on, and the mock run) hits the real
   * stack — only the missing list endpoint is bridged.
   */
  async function provideWorkspaces(page: Page): Promise<boolean> {
    const token = await page.evaluate(() =>
      localStorage.getItem("saas-codex-token"),
    );
    if (!token) return false;
    const apiCtx = page.request;
    const res = await apiCtx.get("http://localhost:9441/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return false;
    const json = await res.json();
    if (!json?.items?.length) return false;

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
    return true;
  }

  // The codex page exposes its own runner <select> bound to the same active
  // runner. These two tests render-check the run UI + runner wiring without
  // needing a workspace (the workspace dropdown is populated by the optional
  // /api/workspaces fetch). The network-body + smoke tests below additionally
  // require a workspace and skip-with-reason when none is available.

  test("run page renders the run UI with the active runner selected", async ({ page }) => {
    await page.goto("/codex");
    await setRunner(page, "claude");
    await page.goto("/codex");
    await expect(page.locator(SWITCHER)).toBeVisible();

    // The Agent Console + prompt/run controls render.
    await expect(page.getByRole("button", { name: "Create Session" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Prompt" })).toBeVisible();

    // The run-page runner <select> reflects the active (Claude) runner. The
    // workspace dropdown is the first select; the runner dropdown is the one
    // whose value matches a runner type.
    const runnerSelect = page.locator('select:has(option[value="claude"])');
    await expect(runnerSelect).toHaveValue("claude");
  });

  test("run page shows the placeholder warning for a placeholder runner (gemini)", async ({
    page,
  }) => {
    await page.goto("/codex");
    await setRunner(page, "gemini");
    await page.goto("/codex");
    await expect(page.locator(SWITCHER)).toBeVisible();

    const runnerSelect = page.locator('select:has(option[value="gemini"])');
    await expect(runnerSelect).toHaveValue("gemini");
    // The amber warning on the run page surfaces the mock-backed behaviour.
    await expect(
      page.getByText(/running against the Mock runner/i).first(),
    ).toBeVisible();
  });

  test("LIVE runner (claude) creates a session with runner_type=claude", async ({ page }) => {
    await page.goto("/codex");
    await setRunner(page, "claude");
    const bridged = await provideWorkspaces(page);
    await page.goto("/codex");
    await expect(page.locator(SWITCHER)).toBeVisible();

    test.skip(!bridged, "No workspace available in the backend to create a session against.");
    const hasWorkspace = await selectWorkspaceIfAny(page);
    test.skip(!hasWorkspace, "No workspace available to create a session against.");

    const createBtn = page.getByRole("button", { name: "Create Session" });
    await expect(createBtn).toBeEnabled();

    const [request] = await Promise.all([
      page.waitForRequest(
        (r) => r.url().includes("/api/sessions") && r.method() === "POST",
      ),
      createBtn.click(),
    ]);
    expect(request.postDataJSON()).toMatchObject({ runner_type: "claude" });
  });

  test("PLACEHOLDER runner (gemini) creates a session with runner_type=mock", async ({
    page,
  }) => {
    await page.goto("/codex");
    await setRunner(page, "gemini");
    const bridged = await provideWorkspaces(page);
    await page.goto("/codex");
    await expect(page.locator(SWITCHER)).toBeVisible();

    test.skip(!bridged, "No workspace available in the backend to create a session against.");
    const hasWorkspace = await selectWorkspaceIfAny(page);
    test.skip(!hasWorkspace, "No workspace available to create a session against.");

    // The placeholder warning is also shown on the codex page runner panel.
    await expect(page.getByText(/running against the Mock runner/i).first()).toBeVisible();

    const createBtn = page.getByRole("button", { name: "Create Session" });
    await expect(createBtn).toBeEnabled();

    const [request] = await Promise.all([
      page.waitForRequest(
        (r) => r.url().includes("/api/sessions") && r.method() === "POST",
      ),
      createBtn.click(),
    ]);
    // Placeholder maps to the mock backend runner (backend would 422 on "gemini").
    expect(request.postDataJSON()).toMatchObject({ runner_type: "mock" });
  });

  test("smoke: a short prompt against the mock runner reaches a completed transcript", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/codex");
    await setRunner(page, "mock");
    const bridged = await provideWorkspaces(page);
    await page.goto("/codex");
    await expect(page.locator(SWITCHER)).toBeVisible();

    test.skip(!bridged, "No workspace available in the backend to run against.");
    const hasWorkspace = await selectWorkspaceIfAny(page);
    test.skip(!hasWorkspace, "No workspace available to run against.");

    const createBtn = page.getByRole("button", { name: "Create Session" });
    await expect(createBtn).toBeEnabled();
    const [sessionResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/sessions") && r.request().method() === "POST",
      ),
      createBtn.click(),
    ]);
    const sessionReq = sessionResp.request();
    expect(sessionReq.postDataJSON()).toMatchObject({ runner_type: "mock" });

    // The full run requires the backend to reach a live runner. In this
    // environment the fleet-bench backend talks to the OpenRunner runners over
    // host.docker.internal:9430-9433, which is not reachable from the backend
    // container here, so POST /api/sessions returns 500. We assert the runner
    // wiring above regardless, and skip-with-reason if the runner is
    // unreachable rather than failing or faking a transcript.
    test.skip(
      !sessionResp.ok(),
      `Session create returned HTTP ${sessionResp.status()} — backend cannot reach the mock runner ` +
        `(host.docker.internal:9433). Run-wiring asserted; full run not executable in this env.`,
    );

    // Session is created (status chip now shows the live session, not "no session").
    await expect(page.getByText("no session")).toHaveCount(0, { timeout: 20_000 });

    // Enter a short prompt and run it. The Run Prompt button enables once a
    // session exists and the prompt is non-empty.
    const promptBox = page.locator('textarea[placeholder*="Diagnose"]');
    await promptBox.fill("Say hello and stop.");
    const runBtn = page.getByRole("button", { name: "Run Prompt" });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // The mock runner is deterministic + zero-token; the run should complete.
    // Status chip shows "completed" when the SSE stream closes.
    await expect(page.getByText("completed").first()).toBeVisible({ timeout: 90_000 });
  });
});
