import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test('with the day ending at 3 AM, 1:30 AM still counts as yesterday', async ({ page, api }) => {
  await seedCategory(api)
  // 1:30 AM on Oct 14; an hour of work at 10 PM the evening before
  const lateNight = new Date(2026, 9, 14, 1, 30)
  await page.clock.install({ time: lateNight })
  await api.post('/api/time-records', {
    data: { taskId: null, taskTitle: 'Reading', categoryName: 'Personal Dev', categoryColor: '#81b29a', taskType: 'Reading', startTime: new Date(2026, 9, 13, 22, 0).toISOString(), endTime: new Date(2026, 9, 13, 23, 0).toISOString(), duration: 3600 },
  })
  await page.goto(APP_URL)
  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Today total')).toHaveText('0:00') // midnight is the default

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByLabel('Day ends at').selectOption('27')
  await page.keyboard.press('Escape')

  await expect(panel.getByLabel('Today total')).toHaveText('1:00')
  await expect(panel).toContainText('Tue, Oct 13')
})
