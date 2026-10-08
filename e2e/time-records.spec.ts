import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test('stepping between days in Time records does not flash a loading screen', async ({ page, api }) => {
  await seedCategory(api)
  await page.goto(APP_URL)
  await page.getByRole('button', { name: 'Time records' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Loading...')).toHaveCount(0)

  // Watch for the spinner while stepping back and forward
  await page.evaluate(() => {
    ;(window as { flashes?: number }).flashes = 0
    new MutationObserver(() => {
      if (document.querySelector('[role="dialog"]')?.textContent?.includes('Loading...')) (window as { flashes?: number }).flashes!++
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  for (let i = 0; i < 3; i++) await dialog.getByRole('button', { name: 'Previous day' }).click()
  await dialog.getByRole('button', { name: 'Next day' }).click()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => (window as { flashes?: number }).flashes)).toBe(0)
})

test('editing a Personal dev record updates its tile right away', async ({ page, api }) => {
  await seedCategory(api)
  const start = new Date()
  start.setHours(14, 0, 0, 0)
  const res = await api.post('/api/time-records', {
    data: { taskTitle: 'Research', categoryName: 'Personal Dev', categoryColor: '#c58b2b', taskType: 'Research', startTime: start.toISOString(), endTime: new Date(start.getTime() + 90 * 60_000).toISOString(), duration: 5400 },
  })
  const record = await res.json()
  await page.goto(APP_URL)
  const tile = page.getByRole('complementary', { name: 'Today panel' }).getByRole('button', { name: /Research/ })
  await expect(tile).toContainText('01:30')

  // The same request Time records sends when you shorten the session to an hour
  await page.evaluate(async ({ id, start }) => {
    await fetch(`/api/time-records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endTime: new Date(new Date(start).getTime() + 60 * 60_000).toISOString(), duration: 3600 }),
    })
  }, { id: record.id, start: start.toISOString() })
  await expect(tile).toContainText('01:00', { timeout: 3000 })
})
