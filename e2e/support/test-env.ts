import { config as loadEnv } from 'dotenv'
import path from 'node:path'

/**
 * Test environment contract. Loads .env.test (test-only overrides) on top of
 * .env.local (for the Supabase public keys used by auth). Never commit .env.test.
 */
loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env.test'), override: true })

/** Local Docker Postgres — the isolated test database (never production). */
export const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/academic_dashboard'

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''

export const AUTH_STATE_PATH = path.resolve(process.cwd(), 'e2e/.auth/user.json')

export const hasAuthCreds = Boolean(TEST_EMAIL && TEST_PASSWORD)
