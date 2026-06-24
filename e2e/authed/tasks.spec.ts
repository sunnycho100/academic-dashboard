import { test, expect } from '@playwright/test'
import { disableLandingAnimation } from '../support/helpers'
import { seedCategory, seedTask } from '../support/api'

/**
 * Authenticated task lifecycle — characterization tests locking in current
 * behavior before the refactor. Runs in the `authed` project (storageState),
 * against the isolated local test DB which global-setup truncates per run.
 */
test.describe('task lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('a seeded task renders in the list', async ({ page, request }) => {
    const cat = await seedCategory(request)
    await seedTask(request, cat.id, { title: 'Read Chapter 5' })

    await page.goto('/')
    await expect(page.getByText('Read Chapter 5')).toBeVisible()
  })

  test('add a task through the form', async ({ page, request }) => {
    await seedCategory(request, { name: 'TEST MATH200' })
    await page.goto('/')

    await page.getByRole('button', { name: /add task/i }).first().click()
    await page.getByPlaceholder('e.g., Watch Lecture 12').fill('Finish problem set')

    // Radix Select for category
    await page.getByText('Select a category').click()
    await page.getByRole('option').first().click()

    await page.getByRole('button', { name: /^add task$/i }).last().click()
    await expect(page.getByText('Finish problem set')).toBeVisible()
  })

  test('completing a task removes it from the active list', async ({ page, request }) => {
    const cat = await seedCategory(request)
    await seedTask(request, cat.id, { title: 'Submit assignment' })

    await page.goto('/')
    const row = page.locator('.group').filter({ hasText: 'Submit assignment' })
    await expect(row).toBeVisible()

    await row.getByRole('checkbox').click()
    // Completing optimistically removes the task from the active list
    await expect(page.getByText('Submit assignment')).toBeHidden()
  })
})
