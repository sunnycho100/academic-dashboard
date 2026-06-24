import { test, expect } from '@playwright/test'
import { disableLandingAnimation, DEFAULT_CATEGORY_NAMES } from './support/helpers'

/**
 * Guest-mode smoke tests — no auth, no DB writes (safe & read-only).
 * Proves the harness works and locks in the unauthenticated shell behavior.
 */
test.describe('guest mode shell', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('dashboard loads with default categories', async ({ page }) => {
    await page.goto('/')
    // Sidebar shows the client-seeded default categories
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
    }
  })

  test('main tabs render and switch', async ({ page }) => {
    await page.goto('/')
    const catchup = page.getByRole('button', { name: /class catch-up/i })
    const timetable = page.getByRole('button', { name: /timetable/i })
    await expect(catchup).toBeVisible()
    await expect(timetable).toBeVisible()
    await timetable.click()
    // Timetable view mounts (no crash); catch-up tab still present to switch back
    await expect(catchup).toBeVisible()
  })

  test('login page is reachable', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  })
})
