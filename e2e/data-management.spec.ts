import { test, expect, APP_URL, launchApp } from './support/app'
import { seedCategory, seedTask } from './support/api'

test.describe('data management', () => {
  test('export saves a dashboard JSON file', async ({ page, api, electronApp }) => {
    const cat = await seedCategory(api)
    const task = await seedTask(api, cat.id, { title: 'Exportable task' })
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    await api.post('/api/time-records', {
      data: { taskId: task.id, taskTitle: 'Exportable task', categoryName: cat.name, categoryColor: cat.color, taskType: 'lecture', startTime: start.toISOString(), endTime: new Date(start.getTime() + 25 * 60_000).toISOString(), duration: 1500 },
    })

    await page.goto(APP_URL)
    await expect(page.getByText('Exportable task').first()).toBeVisible()

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
    const exported = JSON.parse(body)
    expect(exported.timeRecords).toEqual([expect.objectContaining({ taskId: task.id, duration: 1500 })])
  })

  test('an export imports into a fresh database with every record', async ({ page, api }) => {
    const cat = await seedCategory(api)
    const task = await seedTask(api, cat.id, { title: 'Round trip task' })
    const undated = await seedTask(api, cat.id, { title: 'No due date', dueAt: null })
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    await api.post('/api/time-records', {
      data: { taskId: task.id, taskTitle: task.title, categoryName: cat.name, categoryColor: cat.color, taskType: 'lecture', startTime: start.toISOString(), endTime: new Date(start.getTime() + 600_000).toISOString(), duration: 600 },
    })
    await api.post('/api/completed-tasks', {
      data: { taskTitle: 'Finished earlier', categoryName: cat.name, categoryColor: cat.color, taskType: 'lecture', actualTimeSpent: 30 },
    })
    await api.post('/api/timetable', {
      data: { date: '2026-10-11', order: 0, plannedStart: '09:00', plannedEnd: '10:00', expectedMinutes: 60, activityName: 'Study', actualStart: null, actualEnd: null, actualMinutes: null, notes: '' },
    })
    await api.post('/api/weekly-plan', { data: { taskId: undated.id, date: '2026-10-12' } })
    await api.put('/api/user-info', { data: { name: 'Sunny' } })
    const exported = await (await api.get('/api/bulk')).json()

    const fresh = await launchApp()
    try {
      const page2 = await fresh.app.firstWindow()
      await page2.goto(APP_URL)
      await page2.getByRole('button', { name: 'Settings' }).click()
      await page2.getByRole('menuitem', { name: /import data/i }).click()
      const reloaded = page2.waitForEvent('load')
      await page2.locator('input[type=file]').setInputFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) })
      await reloaded
      await expect(page2.getByText('Round trip task').first()).toBeVisible()

      const imported = await page2.evaluate(() => fetch('/api/bulk').then((r) => r.json()))
      const counts = (d: Record<string, unknown>) =>
        Object.fromEntries(['categories', 'tasks', 'completedTasks', 'timeRecords', 'timetableEntries', 'weeklyPlanEntries'].map((k) => [k, (d[k] as unknown[]).length]))
      expect(counts(imported)).toEqual(counts(exported))
      expect(counts(imported)).toEqual({ categories: 1, tasks: 2, completedTasks: 1, timeRecords: 1, timetableEntries: 1, weeklyPlanEntries: 1 })
      expect(imported.userInfo.name).toBe('Sunny')
      expect(imported.timeRecords[0].taskId).toBe(imported.tasks.find((t: { title: string }) => t.title === 'Round trip task').id)
    } finally {
      await fresh.close()
    }
  })

  test('an old export with only courses and tasks still imports', async ({ api }) => {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    await api.post('/api/time-records', {
      data: { taskTitle: 'Earlier work', categoryName: 'X', categoryColor: '#000', taskType: 'lecture', startTime: start.toISOString(), endTime: new Date(start.getTime() + 60_000).toISOString(), duration: 60 },
    })
    const res = await api.post('/api/bulk', {
      data: {
        action: 'import',
        categories: [{ id: 'c1', userId: 'local', name: 'Old', color: '#000', order: 0 }],
        tasks: [{ id: 't1', userId: 'local', title: 'Old task', type: 'lecture', categoryId: 'c1', dueAt: '2026-10-20T12:00:00.000Z', status: 'todo', priorityOrder: 0, createdAt: '2026-10-01T12:00:00.000Z' }],
      },
    })
    expect(res.ok()).toBe(true)
    const all = await (await api.get('/api/bulk')).json()
    expect(all.tasks.map((t: { title: string }) => t.title)).toEqual(['Old task'])
    expect(all.timeRecords).toHaveLength(1)
  })

  test('a failed import changes nothing', async ({ api }) => {
    const cat = await seedCategory(api)
    await seedTask(api, cat.id, { title: 'Keep me' })
    // The second task points at a course that is not in the file
    const res = await api.post('/api/bulk', {
      data: {
        action: 'import',
        categories: [{ id: 'c1', name: 'New', color: '#000' }],
        tasks: [
          { id: 't1', title: 'Fine', type: 'lecture', categoryId: 'c1', dueAt: '2026-10-20T12:00:00.000Z' },
          { id: 't2', title: 'Broken', type: 'lecture', categoryId: 'missing', dueAt: '2026-10-20T12:00:00.000Z' },
        ],
      },
    })
    expect(res.ok()).toBe(false)
    const tasks = await (await api.get('/api/tasks')).json()
    expect(tasks.map((t: { title: string }) => t.title)).toEqual(['Keep me'])
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
