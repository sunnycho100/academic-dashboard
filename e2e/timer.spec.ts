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
