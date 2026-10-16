import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './support/app'

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
