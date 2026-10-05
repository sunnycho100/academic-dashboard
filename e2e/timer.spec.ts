import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('a paused gap is not counted when the timer resumes', async ({ page, api }) => {
  const cat = await seedCategory(api)
  await seedTask(api, cat.id, { title: 'Single-cycle review' })
  const afternoon = new Date()
  afternoon.setHours(14, 0, 0, 0)
  await page.clock.install({ time: afternoon })
  await page.goto(APP_URL)

  await page.locator('.group').filter({ hasText: 'Single-cycle review' }).getByTitle("Add to Today's Plan").click()
  const row = page.getByTitle('Start timer').first()
  await row.click()
  await page.clock.runFor(10 * 60_000)
  await page.getByTitle('Pause timer').first().click()

  // An hour away from the desk, then back
  await page.clock.runFor(60 * 60_000)
  await page.getByTitle('Resume timer').first().click()
  await page.clock.runFor(5_000)

  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Active timer')).toHaveText(/0:10:0[4-6]/)
  // Today total counts each second once: the saved 10:00 segment plus the live 0:05
  await expect(panel.getByText(/Today total/i)).toHaveText(/0:10:0[4-6]/)
})

test('a wrong stored count corrects itself from the saved records', async ({ page, api }) => {
  const cat = await seedCategory(api)
  const task = await seedTask(api, cat.id, { title: 'Single-cycle review' })
  const start = new Date()
  start.setHours(14, 0, 0, 0)
  await api.post('/api/time-records', {
    data: { taskId: task.id, taskTitle: 'Single-cycle review', categoryName: 'X', categoryColor: '#3b2fd6', taskType: 'Lecture', startTime: start.toISOString(), endTime: new Date(start.getTime() + 600_000).toISOString(), duration: 600 },
  })

  // What the old build left behind: a paused timer whose own count says 5:15:40
  await page.addInitScript((id) => {
    localStorage.setItem('class-catchup-today-local', JSON.stringify([id]))
    localStorage.setItem('class-catchup-today-date-local', new Date().toDateString())
    localStorage.setItem('class-catchup-timers-local', JSON.stringify({
      [id]: { isRunning: true, isPaused: true, elapsedSeconds: 5 * 3600 + 15 * 60 + 40, segmentStartedAt: null, lastTickAt: null },
    }))
  }, task.id)
  await page.goto(APP_URL)

  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Active timer')).toHaveText('0:10:00')
})
