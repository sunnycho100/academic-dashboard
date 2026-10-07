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
