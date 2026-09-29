import { type Page } from '@playwright/test'

/**
 * Disable the welcome/landing animation so the dashboard renders immediately.
 * Must be called before the first navigation.
 */
export async function disableLandingAnimation(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('welcome-animation-frequency', 'never')
    } catch {
      /* ignore */
    }
  })
}

