import { test, expect, APP_URL, type ApiClient } from './support/app'
import { seedCategory, seedTask } from './support/api'

// Drags take a while on CI's virtual display
test.describe.configure({ timeout: 60_000 })

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const planned = async (api: ApiClient) =>
  (await (await api.get(`/api/timetable?date=${today()}`)).json()) as { activityName: string; expectedMinutes: number; plannedStart: string }[]

test('dragging a Today task onto the Planned lane plans it where the preview says', async ({ page, api }) => {
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
  const preview = page.locator('[data-planned-drop] [aria-hidden]').filter({ hasText: /to/ })
  await expect(preview).toBeVisible()
  const shownTime = (await preview.locator('p').nth(1).innerText()).split(' to ')[0]
  await page.mouse.up()

  await expect.poll(async () => (await planned(api)).map((e) => [e.activityName, e.expectedMinutes])).toEqual([['Read chapter 7', 30]])
  const [h, m] = (await planned(api))[0].plannedStart.split(':').map(Number)
  expect(shownTime.startsWith(`${h % 12 || 12}:${String(m).padStart(2, '0')}`)).toBe(true)
})

test('a planned block drags an hour later, and × removes it', async ({ page, api }) => {
  // Planned at the current hour, so it sits next to "now" where the timeline opens
  const hour = new Date().getHours()
  const at = (h: number) => `${String(h % 24).padStart(2, '0')}:00`
  await api.put('/api/timetable', {
    data: { date: today(), entries: [{ order: 0, plannedStart: at(hour), plannedEnd: at(hour + 1), expectedMinutes: 60, activityName: 'Review notes', actualStart: null, actualEnd: null, actualMinutes: null, notes: '' }] },
  })
  await seedCategory(api) // the Today panel only renders once a course exists
  await page.goto(APP_URL)

  const block = page.locator('[data-lane="planned"]', { hasText: 'Review notes' })
  await expect(block).toBeVisible()
  const b = (await block.boundingBox())!
  const x = b.x + b.width / 2
  await page.mouse.move(x, b.y + 8)
  await page.mouse.down()
  await page.mouse.move(x, b.y + 20, { steps: 4 }) // starts the drag (it needs 8px)
  await page.mouse.move(x, b.y + 8 + 64, { steps: 8 }) // 64px is an hour
  await page.mouse.up()
  await expect.poll(async () => (await planned(api))[0]?.plannedStart).toBe(at(hour + 1))

  await block.hover()
  await block.getByRole('button', { name: 'Remove Review notes from the plan' }).click()
  await expect(block).toHaveCount(0)
  await expect.poll(async () => (await planned(api)).length).toBe(0)
})
