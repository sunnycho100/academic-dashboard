import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export { expect } from '@playwright/test'

export const APP_URL = 'app://local/'

/** Minimal stand-in for Playwright's APIRequestContext: calls /api/* through the app itself. */
export interface ApiClient {
  get(url: string): Promise<ApiResponse>
  post(url: string, opts?: { data?: unknown }): Promise<ApiResponse>
  put(url: string, opts?: { data?: unknown }): Promise<ApiResponse>
}
interface ApiResponse {
  ok(): boolean
  status(): number
  json(): Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- mirrors Playwright's APIResponse.json()
}

export const test = base.extend<{ electronApp: ElectronApplication; page: Page; api: ApiClient }>({
  electronApp: async ({}, use) => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'academic-dashboard-e2e-'))
    const app = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
      env: { ...process.env, ACADEMIC_DASHBOARD_USER_DATA: userData },
    })
    await use(app)
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
  api: async ({ page }, use) => {
    const call = async (method: string, url: string, data?: unknown): Promise<ApiResponse> => {
      const res = await page.evaluate(
        async ({ method, url, data }) => {
          const r = await fetch(url, {
            method,
            headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: data === undefined ? undefined : JSON.stringify(data),
          })
          return { status: r.status, text: await r.text() }
        },
        { method, url, data },
      )
      return {
        ok: () => res.status >= 200 && res.status < 300,
        status: () => res.status,
        json: async () => JSON.parse(res.text),
      }
    }
    await use({ get: (url) => call('GET', url), post: (url, opts) => call('POST', url, opts?.data), put: (url, opts) => call('PUT', url, opts?.data) })
  },
})
