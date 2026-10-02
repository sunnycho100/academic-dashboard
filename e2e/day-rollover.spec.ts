import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test('a window left open past midnight reloads into the new day', async ({ page, api }) => {
  await seedCategory(api)
  const lateNight = new Date()
  lateNight.setHours(23, 58, 0, 0)
  await page.clock.install({ time: lateNight })
  await page.goto(APP_URL)
  await expect(page.getByRole('complementary', { name: 'Today panel' })).toBeVisible()

  // Before midnight nothing happens
  await page.evaluate(() => ((window as { stale?: boolean }).stale = true))
  await page.clock.fastForward('01:00')
  expect(await page.evaluate(() => (window as { stale?: boolean }).stale)).toBe(true)

  // Past midnight the next check reloads the page
  const reloaded = page.waitForEvent('load')
  await page.clock.fastForward('03:00')
  await reloaded
  expect(await page.evaluate(() => (window as { stale?: boolean }).stale)).toBeUndefined()
})

test('waking the Mac on a new day reloads right away', async ({ page, api, electronApp }) => {
  await seedCategory(api)
  const evening = new Date()
  evening.setHours(22, 0, 0, 0)
  await page.clock.install({ time: evening })
  await page.goto(APP_URL)
  await expect(page.getByRole('complementary', { name: 'Today panel' })).toBeVisible()
  await page.evaluate(() => ((window as { stale?: boolean }).stale = true))

  // Asleep overnight: the clock jumps but no timer has fired yet
  const morning = new Date(evening)
  morning.setDate(morning.getDate() + 1)
  morning.setHours(8)
  await page.clock.setSystemTime(morning)

  const reloaded = page.waitForEvent('load')
  await electronApp.evaluate(({ powerMonitor }) => powerMonitor.emit('resume'))
  await reloaded
  expect(await page.evaluate(() => (window as { stale?: boolean }).stale)).toBeUndefined()
})
