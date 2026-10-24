import fs from 'node:fs'
import path from 'node:path'
import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test('the window writes the status the macOS widget reads', async ({ page, electronApp }) => {
  const dir = await electronApp.evaluate(({ app }) => app.getPath('userData'))
  const file = path.join(dir, 'widget-status.json')
  await page.evaluate(() => localStorage.setItem('personal-dev-timers', JSON.stringify({ reading: { isRunning: true, segmentStartedAt: new Date(Date.now() - 600_000).toISOString() } })))
  await page.reload()

  await expect.poll(() => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).title : null)).toBe('Reading')
  const s = JSON.parse(fs.readFileSync(file, 'utf8'))
  expect(s.state).toBe('running')
  expect(s.elapsedRunning).toBe(true)
  expect(s.elapsed).toBeGreaterThanOrEqual(599)
  expect(s.rate).toBe(20)
})

test('the widget ignores a timer left paused on an earlier day', async ({ page, electronApp }) => {
  const dir = await electronApp.evaluate(({ app }) => app.getPath('userData'))
  const file = path.join(dir, 'widget-status.json')
  const old = new Date(Date.now() - 5 * 86_400_000).toISOString()
  await page.evaluate((old) => localStorage.setItem('class-catchup-timers-local', JSON.stringify({ gone: { isRunning: true, isPaused: true, elapsedSeconds: 2590, segmentStartedAt: null, lastTickAt: old, taskTitle: 'Finished days ago' } })), old)
  await page.reload()

  await expect.poll(() => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).state : null)).toBe('idle')
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).title).toBeNull()
})

test('pausing in the main window updates the widget status', async ({ page, api, electronApp }) => {
  const dir = await electronApp.evaluate(({ app }) => app.getPath('userData'))
  const file = path.join(dir, 'widget-status.json')
  const state = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).state : null)
  const cat = await seedCategory(api)
  await seedTask(api, cat.id, { title: 'Pipelining review' })
  await page.goto(APP_URL)
  await page.locator('.group').filter({ hasText: 'Pipelining review' }).getByTitle("Add to Today's Plan").click()
  await page.getByTitle('Start timer').first().click()
  await expect.poll(state).toBe('running')
  await page.getByTitle('Pause timer').first().click()
  await expect.poll(state).toBe('paused')
})
