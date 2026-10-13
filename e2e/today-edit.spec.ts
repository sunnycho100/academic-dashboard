import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('a task in Today can be renamed, re-estimated and edited from its menu', async ({ page, api }) => {
  const cat = await seedCategory(api)
  await seedTask(api, cat.id, { title: 'Read chapter 7' })
  await page.goto(APP_URL)
  await page.locator('.group').filter({ hasText: 'Read chapter 7' }).getByTitle("Add to Today's Plan").click()

  const row = page.locator('.group').filter({ has: page.getByTitle('Start timer') })
  await row.getByText('Read chapter 7').click()
  await row.getByRole('textbox').fill('Read chapter 7 and 8')
  await row.getByRole('textbox').press('Enter')
  await expect(row).toContainText('Read chapter 7 and 8')
  await expect.poll(async () => (await (await api.get('/api/tasks')).json()).map((t: { title: string }) => t.title)).toContain('Read chapter 7 and 8')

  await row.hover()
  await row.getByRole('button', { name: 'More actions for Read chapter 7 and 8' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
