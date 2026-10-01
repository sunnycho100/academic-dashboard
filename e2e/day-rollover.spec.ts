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
