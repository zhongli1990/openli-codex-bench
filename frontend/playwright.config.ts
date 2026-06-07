import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the fleet-bench frontend (R5 gate G4).
 *
 * Targets the running Next.js app on :9440 (BACKEND on :9441, both behind JWT).
 * Auth is handled by global-setup.ts, which logs in via the backend
 * /api/auth/login proxy and persists a storageState (localStorage token)
 * under playwright/.auth/. All specs reuse that state so they run
 * authenticated without re-logging-in per test.
 *
 * Everything is mock / zero-token: the live runners (opencodex/codex/claude/
 * mock) are real backend runner types; placeholder runners (gemini/azure/...)
 * map to the mock runner.
 */

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:9440";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: require.resolve("./e2e/global-setup"),
  // The auth flow writes the storage state used by every spec.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "e2e/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    storageState: "playwright/.auth/state.json",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
