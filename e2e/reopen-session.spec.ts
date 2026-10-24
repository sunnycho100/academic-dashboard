import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('closing and reopening the app mid-session keeps one record, not pieces', async ({ page, api }) => {
  const cat = await seedCategory(api)
  const task = await seedTask(api, cat.id, { title: 'Console driver review' })
  await page.addInitScript(() => localStorage.setItem('show-seconds', 'true'))
  await page.goto(APP_URL)
  await page.locator('.group').filter({ hasText: 'Console driver review' }).getByTitle("Add to Today's Plan").click()
  await page.getByTitle('Start timer').first().click()

  // Reopen twice while it runs, as happened after quitting and reopening the app
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(1500)
    await page.reload()
    await expect(page.getByTitle('Pause timer').first()).toBeVisible()
  }
  await page.waitForTimeout(1500)
  await page.getByTitle('Pause timer').first().click()

  await expect.poll(async () => {
    const records: { duration: number }[] = await (await api.get(`/api/time-records?taskIds=${task.id}`)).json()
    return records.length
  }).toBe(1)
  const [record] = await (await api.get(`/api/time-records?taskIds=${task.id}`)).json()
  expect(record.duration).toBeGreaterThanOrEqual(4)
})

test('a tick after the unload flush does not bring back the flushed segment', async ({ page, api }) => {
  const cat = await seedCategory(api)
  await seedTask(api, cat.id, { title: 'Pipelining review' })
  await page.goto(APP_URL)
  await page.locator('.group').filter({ hasText: 'Pipelining review' }).getByTitle("Add to Today's Plan").click()
  await page.getByTitle('Start timer').first().click()
  await page.waitForTimeout(1500)

  const segment = () => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('class-catchup-timers-local') || '{}') as Record<string, { segmentStartedAt: string }>)[0]?.segmentStartedAt)
  const started = await segment()
  // Quitting runs the flush, but the window can still tick before it closes
  await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')))
  await page.waitForTimeout(2500)
  expect(await segment()).not.toBe(started)
})
