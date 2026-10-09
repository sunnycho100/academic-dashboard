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

test('a session running past midnight is kept once and keeps its count', async ({ page, api }) => {
  const cat = await seedCategory(api)
  const task = await seedTask(api, cat.id, { title: 'S4' })
  const lateNight = new Date()
  lateNight.setHours(23, 50, 0, 0)
  await page.clock.install({ time: lateNight })
  await page.goto(APP_URL)

  await page.locator('.group').filter({ hasText: 'S4' }).getByTitle("Add to Today's Plan").click()
  await page.getByTitle('Start timer').first().click()

  // Past midnight the app reloads into the new day while the timer runs
  const reloaded = page.waitForEvent('load')
  await page.clock.runFor(15 * 60_000)
  await reloaded
  await page.getByTitle('Pause timer').first().click()

  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel.getByLabel('Active timer')).toHaveText(/0:1[45]:\d\d/)

  // Stored once: one record, or back-to-back pieces split at the midnight reload, but
  // never the same time twice. Their durations add up to the 15 minutes worked.
  await expect.poll(async () => {
    const res = await api.get(`/api/time-records?taskIds=${task.id}`)
    const records: Array<{ startTime: string; endTime: string; duration: number }> = await res.json()
    const sorted = records.sort((a, b) => a.startTime.localeCompare(b.startTime))
    const overlaps = sorted.some((r, i) => i > 0 && new Date(r.startTime) < new Date(sorted[i - 1].endTime))
    const total = records.reduce((s, r) => s + r.duration, 0)
    return { overlaps, minutes: Math.round(total / 60) }
  }).toEqual({ overlaps: false, minutes: 15 })
})

test('saving the same segment twice extends it instead of duplicating it', async ({ api }) => {
  await seedCategory(api)
  const start = new Date()
  start.setHours(21, 55, 0, 0)
  const seg = (minutes: number) => ({
    data: { taskId: 'task-1', taskTitle: 'S4', categoryName: 'X', categoryColor: '#3b2fd6', taskType: 'Lecture', startTime: start.toISOString(), endTime: new Date(start.getTime() + minutes * 60_000).toISOString(), duration: minutes * 60 },
  })
  await api.post('/api/time-records', seg(125))
  await api.post('/api/time-records', seg(136))
  const records = await (await api.get('/api/time-records?taskIds=task-1')).json()
  expect(records).toHaveLength(1)
  expect(records[0].duration).toBe(136 * 60)
})
