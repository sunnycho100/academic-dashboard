import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config for the Academic Dashboard.
 *
 * Phase 0 safety net: characterization tests that lock in current behavior
 * before the modernization refactor. The suite must be GREEN on the current
 * (un-refactored) code before any phase merges.
 *
 * Guest-mode specs run against the real dev server with no DB writes (safe,
 * read-only). Authenticated specs require a dedicated test database/user —
 * see e2e/README.md for the env contract.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
