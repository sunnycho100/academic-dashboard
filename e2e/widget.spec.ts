import { test, expect } from './support/app'

/** Desktop widget: opens from Settings, shows the running timer and what today's time is worth. */
test('settings opens the desktop widget with the running timer and earnings', async ({ page, electronApp }) => {
  // A running Personal dev timer that started 30 minutes ago
  await page.evaluate((started) => {
    localStorage.setItem('personal-dev-timers', JSON.stringify({ reading: { isRunning: true, segmentStartedAt: started } }))
    localStorage.setItem('hourly-rate', '20')
  }, new Date(Date.now() - 30 * 60 * 1000).toISOString())

  await page.evaluate(() => fetch('/api/widget', { method: 'POST', body: JSON.stringify({ open: true }) }))
  await expect.poll(() => electronApp.windows().some((w) => w.url().includes('#widget'))).toBe(true)
  const widget = electronApp.windows().find((w) => w.url().includes('#widget'))!

  await expect(widget.getByText('Reading')).toBeVisible()
  await expect(widget.getByLabel('Timer')).toContainText('0:30')
  // 30 minutes at $20/h, plus a few cents if the machine is slow
  await expect(widget.getByText(/\$10\.\d\d/).first()).toBeVisible()

  // The switch at the top right puts the earned amount in the big number, and it keeps climbing
  await widget.getByRole('button', { name: 'Earned' }).click()
  const earnedNow = widget.getByLabel('Earned today')
  await expect(earnedNow).toHaveText(/^\$10\.\d\d$/)
  const first = await earnedNow.innerText()
  await expect(earnedNow).not.toHaveText(first, { timeout: 5000 }) // 1 cent per 1.8 s

  await page.evaluate(() => fetch('/api/widget', { method: 'POST', body: JSON.stringify({ open: false }) }))
  await expect.poll(() => electronApp.windows().some((w) => w.url().includes('#widget'))).toBe(false)
})
