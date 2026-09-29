import { test, expect, APP_URL } from './support/app'
import { disableLandingAnimation } from './support/helpers'

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('a fresh install opens to the welcome state', async ({ page }) => {
    await page.goto(APP_URL)
    await expect(page.getByText('Welcome to Class Catch-up!')).toBeVisible()
  })

  test('main tabs render and switch', async ({ page }) => {
    await page.goto(APP_URL)
    const catchup = page.getByRole('button', { name: /class catch-up/i })
    const timetable = page.getByRole('button', { name: /timetable/i })
    await expect(catchup).toBeVisible()
    await timetable.click()
    await expect(catchup).toBeVisible()
  })

  test('light mode is the default', async ({ page }) => {
    await page.goto(APP_URL)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
