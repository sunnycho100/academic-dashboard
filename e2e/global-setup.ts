import { chromium, type FullConfig } from '@playwright/test'
import { Pool } from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import {
  TEST_DATABASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  AUTH_STATE_PATH,
  hasAuthCreds,
} from './support/test-env'

/** Data tables to clear for a deterministic run (test DB only). */
const DATA_TABLES = [
  'WeeklyPlanEntry',
  'CompletedTask',
  'TimeRecord',
  'TimetableEntry',
  'Task',
  'Category',
  'UserInfo',
]

async function resetTestDatabase() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL })
  try {
    await pool.query(
      `TRUNCATE TABLE ${DATA_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
    )
  } finally {
    await pool.end()
  }
}

async function saveAuthState(baseURL: string) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    await page.goto(`${baseURL}/login`)
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    // Successful sign-in redirects to the dashboard
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15_000,
    })
    fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true })
    await page.context().storageState({ path: AUTH_STATE_PATH })
  } finally {
    await browser.close()
  }
}

export default async function globalSetup(config: FullConfig) {
  if (!hasAuthCreds) {
    // No creds → only guest-mode specs run. Authenticated specs skip themselves.
    console.warn(
      '\n[e2e] E2E_TEST_EMAIL/E2E_TEST_PASSWORD not set — authenticated specs will be skipped.\n' +
        '      See e2e/README.md to enable the full safety net.\n',
    )
    return
  }
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  await resetTestDatabase()
  await saveAuthState(baseURL)
}
