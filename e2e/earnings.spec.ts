import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test("stepping the timeline back a day shows that day's total and earnings", async ({ page, api }) => {
  await seedCategory(api)
  const afternoon = new Date()
  afternoon.setHours(15, 0, 0, 0)
  await page.clock.install({ time: afternoon })
  // Two hours yesterday afternoon
  const y = new Date(afternoon)
  y.setDate(y.getDate() - 1)
  y.setHours(13, 0, 0, 0)
  await api.post('/api/time-records', {
    data: { taskId: null, taskTitle: 'Reading', categoryName: 'Personal Dev', categoryColor: '#81b29a', taskType: 'Reading', startTime: y.toISOString(), endTime: new Date(y.getTime() + 2 * 3600e3).toISOString(), duration: 7200 },
  })
  await page.goto(APP_URL)
  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Today total')).toHaveText('0:00')

  await panel.getByRole('button', { name: 'Previous day' }).click()
  await expect(panel.getByLabel('Today total')).toHaveText('2:00')
  await expect(panel).toContainText('$40.00') // 2 hours at $20
  await expect(panel).not.toContainText('Today so far')

  await panel.getByRole('button', { name: 'Back to today' }).click()
  await expect(panel.getByLabel('Today total')).toHaveText('0:00')
})

test('turning off Show earnings hides the money', async ({ page, api }) => {
  await seedCategory(api)
  await page.goto(APP_URL)
  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel).toContainText('$0.00')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByLabel('Show earnings').click()
  await page.keyboard.press('Escape')

  await expect(panel).not.toContainText('$')
  await expect(panel.getByRole('group', { name: 'Big number shows' })).toHaveCount(0)
})
