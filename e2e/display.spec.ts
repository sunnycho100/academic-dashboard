import { test, expect, APP_URL } from './support/app'
import { seedCategory } from './support/api'

test('Edit display previews a color theme, Cancel restores it and Save keeps it', async ({ page, api }) => {
  await seedCategory(api)
  await page.goto(APP_URL)
  const html = page.locator('html')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: 'Edit display' }).click()
  const bar = page.getByRole('region', { name: 'Edit display' })

  await bar.getByRole('button', { name: 'Kraft' }).click()
  await expect(html).toHaveAttribute('data-palette', 'kraft')
  await bar.getByRole('button', { name: 'Cancel' }).click()
  await expect(bar).toHaveCount(0)
  await expect(html).not.toHaveAttribute('data-palette', /.+/)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: 'Edit display' }).click()
  await bar.getByRole('button', { name: 'Ledger' }).click()
  await bar.getByRole('button', { name: 'Last 7 days' }).click()
  // Previewing the empty-panel choice shows it right away
  await expect(page.getByRole('img', { name: /in the last 7 days/ })).toBeVisible()
  await bar.getByRole('button', { name: 'Save' }).click()

  await page.reload()
  await expect(html).toHaveAttribute('data-palette', 'ledger')
  await expect(page.getByRole('img', { name: /in the last 7 days/ })).toBeVisible() // nothing planned
})
