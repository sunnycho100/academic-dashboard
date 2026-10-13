import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('dragging a Today task onto the Planned lane plans it, and × removes it', async ({ page, api }) => {
  const cat = await seedCategory(api)
  const task = await seedTask(api, cat.id, { title: 'Read chapter 7' })
  await page.evaluate((id) => fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimatedDuration: 30 }) }), task.id)
  await page.goto(APP_URL)
  await page.locator('.group').filter({ hasText: 'Read chapter 7' }).getByTitle("Add to Today's Plan").click()

  const grip = page.locator('.group').filter({ has: page.getByTitle('Start timer') }).getByTitle('Drag to reorder')
  const scroll = (await page.locator('[data-timeline-scroll]').boundingBox())!
  const g = (await grip.boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  // Into the left half of the timeline (the Planned lane), in the middle of what's visible
  await page.mouse.move(scroll.x + scroll.width * 0.35, scroll.y + scroll.height / 2, { steps: 12 })
  await expect(page.locator('[data-planned-drop] [aria-hidden]').filter({ hasText: /to/ })).toBeVisible() // the drop preview
  // The preview names the task and the time it will land at
  const preview = page.locator('[data-planned-drop] [aria-hidden]').filter({ hasText: /to/ })
  const shownTime = (await preview.locator('p').nth(1).innerText()).split(' to ')[0]
  await page.mouse.up()

  const date = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  await expect.poll(async () => (await (await api.get(`/api/timetable?date=${date}`)).json()).map((e: { activityName: string; expectedMinutes: number }) => [e.activityName, e.expectedMinutes]))
    .toEqual([['Read chapter 7', 30]])
  const block = page.locator('[data-lane="planned"]', { hasText: 'Read chapter 7' })
  await expect(block).toBeVisible()
  // It lands where the preview said: the saved start matches the preview's time
  const [start] = (await (await api.get(`/api/timetable?date=${date}`)).json()).map((e: { plannedStart: string }) => e.plannedStart)
  const [h, m] = start.split(':').map(Number)
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')}`
  expect(shownTime.startsWith(label)).toBe(true)

  // Dragging the planned block down one hour moves it by an hour
  const startOf = async () => (await (await api.get(`/api/timetable?date=${date}`)).json())[0]?.plannedStart as string
  const before = await startOf()
  // Wait until the block stops moving (the timeline reloads after planning)
  let last = ''
  await expect.poll(async () => {
    const now = JSON.stringify(await block.boundingBox())
    const settled = now === last
    last = now
    return settled
  }, { intervals: [200] }).toBe(true)
  const b = (await block.boundingBox())!
  const x = b.x + b.width / 2
  await page.mouse.move(x, b.y + 8)
  await page.mouse.down()
  // A short move first starts the drag (it needs 8px), then the hour's worth
  await page.mouse.move(x, b.y + 20, { steps: 4 })
  await page.waitForTimeout(100)
  await page.mouse.move(x, b.y + 8 + 64, { steps: 10 })
  await page.waitForTimeout(100)
  await page.mouse.up()
  const hourLater = (t: string) => { const [h, m] = t.split(':').map(Number); return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
  await expect.poll(startOf).toBe(hourLater(before))

  await block.hover()
  await block.getByRole('button', { name: 'Remove Read chapter 7 from the plan' }).click()
  await expect(block).toHaveCount(0)
  await expect.poll(async () => (await (await api.get(`/api/timetable?date=${date}`)).json()).length).toBe(0)
})
