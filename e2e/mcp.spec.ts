import path from 'node:path'
import { test, expect } from './support/app'
import { seedCategory } from './support/api'
import { Client } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'
import { StdioClientTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js'

// The Claude connector, talking to the running app through its local bridge
test('the Claude connector adds a task to Today, plans a block and lists them', async ({ page, electronApp, api }) => {
  await seedCategory(api, { name: 'ECE 353' })
  await page.reload()
  const userData = await electronApp.evaluate(({ app }) => app.getPath('userData'))
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve(__dirname, '..', 'mcp', 'server.mjs')],
      env: { ...process.env, ACADEMIC_DASHBOARD_USER_DATA: userData } as Record<string, string>,
    }),
  )
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean }
    return { text: res.content[0].text, isError: res.isError }
  }

  const added = await call('add_task', { title: 'Lab 4 prelab', course: 'ece 353', estimate_minutes: 45, add_to_today: true })
  expect(added.text).toContain('Added "Lab 4 prelab" to ECE 353')
  // It shows in the open app at once, in Today's plan
  await expect(page.locator('.group').filter({ hasText: 'Lab 4 prelab' }).getByTitle('Start timer')).toBeVisible()

  const late = await call('add_task', { title: 'Old reading', course: 'ECE 353', due: '2020-01-01' })
  expect(late.isError).toBeFalsy()
  const overdue = await call('list_tasks', { group: 'overdue' })
  expect(overdue.text).toContain('Old reading')
  expect((await call('list_tasks', { group: 'today' })).text).toContain('Lab 4 prelab')

  const planned = await call('plan_time_block', { title: 'Prelab', start: '14:00', minutes: 90 })
  expect(planned.text).toContain('14:00 to 15:30')
  expect((await call('list_time_blocks')).text).toContain('14:00 to 15:30 Prelab')

  expect((await call('complete_task', { task: 'Old reading' })).text).toContain('Completed')
  expect((await call('list_tasks', { group: 'overdue' })).text).not.toContain('Old reading')

  const unknown = await call('add_task', { title: 'x', course: 'Nope' })
  expect(unknown.isError).toBe(true)
  await client.close()
})
