import { test, expect } from '@playwright/test'
import { disableLandingAnimation } from '../support/helpers'

/**
 * Timetable auto-logic — locks in the "autofill planned start" behavior: focusing
 * an empty planned-start field fills it (current time rounded, or prior row's end).
 */
test.describe('timetable autofill', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('focusing an empty planned-start autofills a time', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /timetable/i }).click()

    // The grid pre-pads blank rows; the first planned-start cell starts empty.
    const plannedStart = page.locator('input[type="time"]').first()
    await expect(plannedStart).toHaveValue('')

    // A real click focuses the field and triggers the autofill onFocus handler.
    await plannedStart.click()
    await expect(plannedStart).toHaveValue(/^\d{1,2}:\d{2}$/)
  })
})
