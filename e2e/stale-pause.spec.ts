import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('a task paused yesterday is not shown as Paused; the first task in the plan is up next', async ({ page, api }) => {
  const cat = await seedCategory(api)
  const first = await seedTask(api, cat.id, { title: 'Problem set 5' })
  const old = await seedTask(api, cat.id, { title: 'project3 prep' })
  const yesterday = new Date(Date.now() - 26 * 3600e3).toISOString()
  await page.addInitScript(({ ids, yesterday }) => {
    localStorage.setItem('class-catchup-today-local', JSON.stringify(ids))
    localStorage.setItem('class-catchup-today-date-local', new Date().toDateString())
    localStorage.setItem('class-catchup-timers-local', JSON.stringify({
      [ids[1]]: { isRunning: true, isPaused: true, elapsedSeconds: 0, segmentStartedAt: null, lastTickAt: yesterday, taskTitle: 'project3 prep' },
    }))
  }, { ids: [first.id, old.id], yesterday })
  await page.goto(APP_URL)

  const panel = page.getByRole('complementary', { name: 'Today panel' })
  await expect(panel).toContainText('Up next')
  await expect(panel).toContainText('Problem set 5')
  await expect(panel).not.toContainText('Paused')
})
