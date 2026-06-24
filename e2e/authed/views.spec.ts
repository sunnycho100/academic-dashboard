import { test, expect } from '@playwright/test'
import { disableLandingAnimation } from '../support/helpers'
import { seedCategory, seedTask } from '../support/api'

/**
 * View-mode filtering — locks in the All / Overdue / Due Soon tab behavior
 * driven by task due dates.
 */
test.describe('view filters', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('overdue and due-soon tabs filter by due date', async ({ page, request }) => {
    const cat = await seedCategory(request)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    await seedTask(request, cat.id, { title: 'Overdue essay', dueAt: yesterday })
    await seedTask(request, cat.id, { title: 'Upcoming quiz', dueAt: tomorrow })

    await page.goto('/')
    // All: both visible
    await expect(page.getByText('Overdue essay')).toBeVisible()
    await expect(page.getByText('Upcoming quiz')).toBeVisible()

    // Overdue tab: only the overdue task
    await page.getByRole('tab', { name: /^overdue$/i }).click()
    await expect(page.getByText('Overdue essay')).toBeVisible()
    await expect(page.getByText('Upcoming quiz')).toBeHidden()

    // Due Soon tab: only the upcoming task
    await page.getByRole('tab', { name: /due soon/i }).click()
    await expect(page.getByText('Upcoming quiz')).toBeVisible()
    await expect(page.getByText('Overdue essay')).toBeHidden()
  })
})
