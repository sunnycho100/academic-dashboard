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

test.describe('day timeline', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('shows planned and actual lanes, and the setting hides each', async ({ page, api }) => {
    await seedCategory(api) // the Today panel only renders once a course exists
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`
    const res = await api.put('/api/timetable', {
      data: {
        date,
        entries: [
          { order: 0, plannedStart: hh(now.getHours()), plannedEnd: hh(now.getHours() + 1), expectedMinutes: 60, activityName: 'Planned reading', notes: '', actualStart: null, actualEnd: null, actualMinutes: null },
        ],
      },
    })
    expect(res.ok()).toBeTruthy()
    const start = new Date(now.getTime() - 50 * 60_000)
    await api.post('/api/time-records', {
      data: { taskTitle: 'Tracked lab', categoryName: 'X', categoryColor: '#3f7d5c', taskType: 'Lab', startTime: start.toISOString(), endTime: new Date(start.getTime() + 30 * 60_000).toISOString(), duration: 1800 },
    })

    await page.goto(APP_URL)
    const panel = page.getByRole('complementary', { name: 'Today panel' })
    const planned = panel.locator('[data-lane="planned"]', { hasText: 'Planned reading' })
    const actual = panel.locator('[data-lane="actual"]', { hasText: 'Tracked lab' })
    await expect(planned).toBeVisible()
    await expect(actual).toBeVisible()

    await panel.getByRole('radio', { name: 'planned' }).click()
    await expect(actual).toHaveCount(0)
    await expect(planned).toBeVisible()

    await panel.getByRole('radio', { name: 'actual' }).click()
    await expect(planned).toHaveCount(0)
    await expect(actual).toBeVisible()

    // The choice sticks across reloads
    await page.reload()
    await expect(panel.locator('[data-lane="planned"]')).toHaveCount(0)
  })
})
