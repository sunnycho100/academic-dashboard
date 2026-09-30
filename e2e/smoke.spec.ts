import { test, expect, APP_URL } from './support/app'

test.describe('app shell', () => {
  test('a fresh install opens to the welcome state', async ({ page }) => {
    await page.goto(APP_URL)
    await expect(page.getByText('Welcome to Class Catch-up!')).toBeVisible()
  })

  test('main tabs render and switch', async ({ page }) => {
    await page.goto(APP_URL)
    const tasks = page.getByRole('tab', { name: 'Tasks' })
    await expect(tasks).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Timetable' }).click()
    await expect(page.getByRole('tab', { name: 'Timetable' })).toHaveAttribute('aria-selected', 'true')
    await tasks.click()
    await expect(tasks).toHaveAttribute('aria-selected', 'true')
  })

  test('light mode is the default', async ({ page }) => {
    await page.goto(APP_URL)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
