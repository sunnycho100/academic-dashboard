import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test('a Life block shows on the timeline but not in the total or earnings', async ({ page, api }) => {
  await seedCategory(api)
  const afternoon = new Date()
  afternoon.setHours(16, 0, 0, 0)
  await page.clock.install({ time: afternoon })
  const at = (h: number, m = 0) => {
    const d = new Date(afternoon)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  // Lunch 12:30 to 2:30 is life; 2:30 to 3:00 is work
  await api.post('/api/time-records', {
    data: { taskId: null, taskTitle: 'Cook and eat', categoryName: 'Life', categoryColor: '#9ca3af', taskType: 'Life', startTime: at(12, 30), endTime: at(14, 30), duration: 7200 },
  })
  await api.post('/api/time-records', {
    data: { taskId: null, taskTitle: 'Reading', categoryName: 'Personal Dev', categoryColor: '#f59e0b', taskType: 'Reading', startTime: at(14, 30), endTime: at(15), duration: 1800 },
  })
  await page.goto(APP_URL)
  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Today total')).toHaveText('0:30')
  await expect(panel).toContainText('$10.00')
  await expect(panel.locator('[data-lane="actual"][data-life]')).toContainText('Cook and eat')
})
