import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

/**
 * Authenticated task lifecycle — characterization tests locking in current
 * behavior before the refactor. Runs in the `authed` project (storageState),
 * against the isolated local test DB which global-setup truncates per run.
 */
test.describe('task lifecycle', () => {
  test('a seeded task renders in the list', async ({ page, api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Read Chapter 5' })

    await page.goto(APP_URL)
    await expect(page.getByText('Read Chapter 5')).toBeVisible()
  })

  test('add a task through the form', async ({ page, api }) => {
    await seedCategory(api, { name: 'TEST MATH200' })
    await page.goto(APP_URL)

    await page.getByRole('button', { name: /add task/i }).first().click()
    await page.getByPlaceholder('Task name').fill('Finish problem set')

    await page.getByRole('radiogroup', { name: 'Course' }).getByRole('radio').first().click()

    await page.getByRole('button', { name: /^add task$/i }).last().click()
    await expect(page.getByText('Finish problem set')).toBeVisible()
  })

  test('add another keeps the dialog open for the next task', async ({ page, api }) => {
    await seedCategory(api, { name: 'TEST MATH200' })
    await page.goto(APP_URL)

    await page.getByRole('button', { name: /add task/i }).first().click()
    await page.getByRole('radiogroup', { name: 'Course' }).getByRole('radio').first().click()
    await page.getByPlaceholder('Task name').fill('Read chapter 1')
    await page.getByRole('button', { name: 'Add another' }).click()

    // Dialog stays open with an empty title, focused for the next one
    await expect(page.getByPlaceholder('Task name')).toHaveValue('')
    await expect(page.getByPlaceholder('Task name')).toBeFocused()
    await page.getByPlaceholder('Task name').fill('Read chapter 2')
    await page.getByRole('button', { name: /^add task$/i }).last().click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Read chapter 1')).toBeVisible()
    await expect(page.getByText('Read chapter 2')).toBeVisible()
  })

  test('completing a task moves it to Done today', async ({ page, api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Submit assignment' })

    await page.goto(APP_URL)
    const row = page.locator('.group').filter({ hasText: 'Submit assignment' })
    await expect(row).toBeVisible()

    await row.getByRole('checkbox').click()
    // Leaves the active list and shows under Done today
    await expect(row).toBeHidden()
    const done = page.getByRole('region', { name: 'Done today' })
    await expect(done.getByText('Submit assignment')).toBeVisible()

    // Still there after a reload (read back from completed tasks)
    await page.reload()
    await expect(page.getByRole('region', { name: 'Done today' }).getByText('Submit assignment')).toBeVisible()
  })

  test('undo from Done today puts the task back', async ({ page, api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Problem set 2' })

    await page.goto(APP_URL)
    await page.locator('.group').filter({ hasText: 'Problem set 2' }).getByRole('checkbox').click()
    const done = page.getByRole('region', { name: 'Done today' })
    const doneRow = done.getByRole('listitem').filter({ hasText: 'Problem set 2' })
    await expect(doneRow).toBeVisible()

    await doneRow.hover()
    await doneRow.getByRole('button', { name: 'Undo', exact: true }).click()

    // Back in the active list, gone from Done today, and it stays that way after a reload
    await expect(done).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.group').filter({ hasText: 'Problem set 2' }).getByRole('checkbox')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Done today' })).toHaveCount(0)
  })
})
