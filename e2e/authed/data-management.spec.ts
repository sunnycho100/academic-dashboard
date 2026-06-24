import { test, expect } from '@playwright/test'
import { disableLandingAnimation } from '../support/helpers'
import { seedCategory, seedTask } from '../support/api'

/**
 * Data management — locks in JSON export from the settings menu.
 */
test.describe('data management', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('export downloads a dashboard JSON file', async ({ page, request }) => {
    const cat = await seedCategory(request)
    await seedTask(request, cat.id, { title: 'Exportable task' })

    await page.goto('/')
    await expect(page.getByText('Exportable task')).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: /export data/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/academic-dashboard-.*\.json/)
  })
})
