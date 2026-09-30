import { test, expect, APP_URL } from './support/app'
import { disableLandingAnimation } from './support/helpers'
import { seedCategory, seedTask } from './support/api'

test.describe('task groups', () => {
  test.beforeEach(async ({ page }) => {
    await disableLandingAnimation(page)
  })

  test('tasks sort into Overdue and Upcoming by due date', async ({ page, api }) => {
    const cat = await seedCategory(api)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    await seedTask(api, cat.id, { title: 'Overdue essay', dueAt: yesterday })
    await seedTask(api, cat.id, { title: 'Upcoming quiz', dueAt: tomorrow })

    await page.goto(APP_URL)
    const overdue = page.getByRole('region', { name: 'Overdue' })
    const upcoming = page.getByRole('region', { name: 'Upcoming' })
    await expect(overdue.getByText('Overdue essay')).toBeVisible()
    await expect(upcoming.getByText('Upcoming quiz')).toBeVisible()
    await expect(overdue.getByText('Upcoming quiz')).toHaveCount(0)
  })

  test('group by course switches to course sections', async ({ page, api }) => {
    const cat = await seedCategory(api, { name: 'TEST PHYS201' })
    await seedTask(api, cat.id, { title: 'Problem set 2' })

    await page.goto(APP_URL)
    await page.getByLabel('Group by course').click()
    await expect(page.getByRole('region', { name: 'TEST PHYS201' }).getByText('Problem set 2')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Upcoming' })).toHaveCount(0)
  })

  test('only a newly added task plays the ring draw-in', async ({ page, api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Existing task' })
    await page.goto(APP_URL)
    const ringOf = (title: string) => page.getByRole('checkbox', { name: `Complete ${title}` }).locator('circle.ring-draw')
    await expect(ringOf('Existing task')).toHaveCount(1) // first appearance draws in

    // Switching tabs must not replay it
    await page.getByRole('tab', { name: 'Timetable' }).click()
    await page.getByRole('tab', { name: 'Tasks' }).click()
    await expect(ringOf('Existing task')).toHaveCount(0)

    await page.getByRole('button', { name: /add task/i }).first().click()
    await page.getByPlaceholder('Task name').fill('Brand new task')
    await page.getByRole('radiogroup', { name: 'Course' }).getByRole('radio').first().click()
    await page.getByRole('button', { name: /^add task$/i }).last().click()
    await expect(ringOf('Brand new task')).toHaveCount(1)
    await expect(ringOf('Existing task')).toHaveCount(0)
  })
})
