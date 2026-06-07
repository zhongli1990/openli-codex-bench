import { test, expect, type Page } from "@playwright/test";

/**
 * 4th QA gate — FUNCTIONAL (browser-level) verification that the CONSOLIDATED
 * runner Settings is actually LIVE on the freshly-rebuilt openli-codex-bench
 * frontend (:9440). This asserts the *deployed render*, not source/tsc/bundle.
 *
 * What "consolidated" means here:
 *  - ONE SSOT runner control: the Settings "Default Runner" radio group bound to
 *    the shared AppContext runner (values opencodex/codex/claude/mock + 4
 *    placeholders), with opencodex selectable. Single source of truth that also
 *    drives the top-bar switcher + run pages.
 *  - The LEGACY duplicate is GONE: no separate "Runners" settings tab/sidebar
 *    entry, and no editable per-runner model dropdown (no Claude-model <select>
 *    with Sonnet/Haiku/Opus, no codexModel select). The per-runner LLM is shown
 *    as a READ-ONLY fixed-model label (gpt-4o / gpt-5.5 / claude-opus-4-8).
 *
 * Auth comes from global-setup (JWT in localStorage). No live agent run.
 */

const SCREENSHOT = "e2e/settings-consolidated-openli-codex.png";

async function gotoSettings(page: Page) {
  await page.goto("/settings");
  await expect(page.locator('input[name="runner"]').first()).toBeVisible();
}

test.describe("Consolidated runner Settings — openli-codex-bench (live :9440)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSettings(page);
  });

  test("1. SSOT runner selector present (4 runners, opencodex selectable)", async ({
    page,
  }) => {
    for (const value of ["opencodex", "codex", "claude", "mock"]) {
      await expect(page.locator(`input[name="runner"][value="${value}"]`)).toBeVisible();
    }
    const opencodex = page.locator('input[name="runner"][value="opencodex"]');
    await opencodex.check();
    await expect(opencodex).toBeChecked();
  });

  test("2. legacy duplicate GONE — no Runners tab, no editable per-runner model dropdown", async ({
    page,
  }) => {
    // (a) No "Runners" settings tab / sidebar entry (sidebar is
    // General/Appearance/About only).
    await expect(page.getByRole("button", { name: /^Runners$/ })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Runners/i })).toHaveCount(0);

    // (b) No editable per-runner model dropdown.
    await expect(page.locator("option", { hasText: /Sonnet/i })).toHaveCount(0);
    await expect(page.locator("option", { hasText: /Haiku/i })).toHaveCount(0);
    await expect(page.locator('select[name*="odel" i]')).toHaveCount(0);
    await expect(page.locator('select[name*="codexModel" i]')).toHaveCount(0);
    // The General tab exposes NO <select> at all (model is read-only text).
    const generalSelects = await page.locator("select").count();
    expect(generalSelects).toBe(0);
  });

  test("3. per-runner LLM shown as READ-ONLY fixed labels (gpt-4o / gpt-5.5 / claude-opus-4-8)", async ({
    page,
  }) => {
    await expect(page.getByText("gpt-4o", { exact: true })).toBeVisible();
    await expect(page.getByText("gpt-5.5", { exact: true })).toBeVisible();
    await expect(page.getByText("claude-opus-4-8", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/fixed by the cost model and is not user-configurable/i),
    ).toBeVisible();
  });

  test("evidence — screenshot of the rendered /settings page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await page.screenshot({ path: SCREENSHOT, fullPage: true });
  });
});
