import { test, expect, APP_URL } from './support/app'
import { disableLandingAnimation } from './support/helpers'
import { seedCategory, seedTask } from './support/api'

/**
 * Today's Plan — locks in adding a task to today (task gains a timer control
 * in the Today panel).
 */
test.describe("today's plan", () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('add a task to today reveals its timer control', async ({ page, api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Plan this today' })

    await page.goto(APP_URL)
    const row = page.locator('.group').filter({ hasText: 'Plan this today' })
    await expect(row).toBeVisible()

    // Empty today → no timer controls yet
    await expect(page.getByTitle('Start timer')).toHaveCount(0)

    await row.getByTitle("Add to Today's Plan").click()

    // Task now in the Today panel with a start-timer affordance
    await expect(page.getByTitle('Start timer').first()).toBeVisible()
  })
})
