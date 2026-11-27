import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the `manual` checks in SPECS.md. They run against the dev
 * app with the local database (PER and PY data ingested), through docker compose:
 *
 *   docker compose up -d && docker compose run --rm e2e
 *
 * Tests read answer keys from the public REST API instead of hard-coding exams,
 * so they keep working as new sessions are added.
 */
export default defineConfig({
  testDir: "./e2e",
  // The dev server compiles each route on first request: be patient.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: "./e2e/warm-up.ts",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    navigationTimeout: 90_000,
    locale: "es-ES",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
