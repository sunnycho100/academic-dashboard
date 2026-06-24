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

/** Default guest-mode categories seeded client-side in app/page.tsx. */
export const DEFAULT_CATEGORY_NAMES = ['CS 400', 'ECE 222', 'CS 354', 'ECE 340']
