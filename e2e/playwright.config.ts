import { defineConfig } from '@playwright/test'

/**
 * E2E against the built Electron app (run `pnpm test:e2e`, which builds first).
 * Each test launches its own app instance with a fresh temp database; see support/app.ts.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  outputDir: '../test-results',
})
