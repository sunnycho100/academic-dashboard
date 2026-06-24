import { defineConfig, devices } from '@playwright/test'
import { TEST_DATABASE_URL, AUTH_STATE_PATH, hasAuthCreds } from './e2e/support/test-env'

/**
 * Playwright E2E config for the Academic Dashboard.
 *
 * Phase 0 safety net: characterization tests that lock in current behavior
 * before the modernization refactor. The suite must be GREEN on the current
 * (un-refactored) code before any phase merges.
 *
 * SAFETY: the dev server is forced to use the LOCAL test database
 * (TEST_DATABASE_URL) via webServer.env, so no test ever touches production.
 *
 * - guest project  → unauthenticated smoke specs (e2e/*.spec.ts), no DB writes.
 * - authed project → authenticated flow specs (e2e/authed/*.spec.ts), gated on
 *   E2E_TEST_EMAIL/PASSWORD; reuses storageState from global-setup.
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
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'guest',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /authed\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(hasAuthCreds
      ? [
          {
            name: 'authed',
            testMatch: /authed\/.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE_PATH },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Force the dev server onto the isolated local test DB.
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
})
