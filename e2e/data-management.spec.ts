import { test, expect, APP_URL } from './support/app'
import { seedCategory, seedTask } from './support/api'

test.describe('data management', () => {
  test('export saves a dashboard JSON file', async ({ page, api, electronApp }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Exportable task' })

    await page.goto(APP_URL)
    await expect(page.getByText('Exportable task')).toBeVisible()

    // A real export opens the macOS save dialog; the test catches the download
    // in the main process instead and saves it to a temp file.
    await electronApp.evaluate(({ session, app }) => {
      const g = globalThis as { exported?: Promise<{ name: string; body: string }> }
      g.exported = new Promise((resolve) => {
        session.defaultSession.once('will-download', (_e, item) => {
          const file = process.getBuiltinModule('node:path').join(app.getPath('temp'), item.getFilename())
          item.setSavePath(file)
          item.once('done', () =>
            resolve({ name: item.getFilename(), body: process.getBuiltinModule('node:fs').readFileSync(file, 'utf8') }),
          )
        })
      })
    })
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('menuitem', { name: /export data/i }).click()

    const { name, body } = await electronApp.evaluate(() => (globalThis as { exported?: Promise<{ name: string; body: string }> }).exported!)
    expect(name).toMatch(/academic-dashboard-.*\.json/)
    expect(body).toContain('Exportable task')
  })

  test('the app keeps a daily backup of the database', async ({ page, electronApp }) => {
    await page.goto(APP_URL)
    await expect
      .poll(() =>
        electronApp.evaluate(({ app }) => {
          const dir = process.getBuiltinModule('node:path').join(app.getPath('userData'), 'backups')
          const fs = process.getBuiltinModule('node:fs')
          return fs.existsSync(dir) ? fs.readdirSync(dir) : []
        }),
      )
      .toEqual([expect.stringMatching(/^academic-dashboard-dev-\d{4}-\d{2}-\d{2}\.db$/)])
  })
})
