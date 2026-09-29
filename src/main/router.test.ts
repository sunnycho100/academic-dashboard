import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRouter } from './router.ts'

const hit = (name: string) => async (_req: Request, ctx: { params: Promise<Record<string, string>> }) =>
  Response.json({ name, params: await ctx.params })

const handle = createRouter({
  './api/tasks/route.ts': { GET: hit('tasks'), POST: hit('tasks-post') },
  './api/tasks/[id]/route.ts': { PATCH: hit('task-id') },
  './api/completed-tasks/[id]/route.ts': { DELETE: hit('ct-id') },
  './api/completed-tasks/cleanup/route.ts': { DELETE: hit('cleanup') },
})
const call = async (method: string, path: string) => {
  const res = await handle(new Request(`app://local${path}`, { method }))
  return { status: res.status, body: await res.json() }
}

test('routes collection, item, and static-over-dynamic', async () => {
  assert.equal((await call('GET', '/api/tasks')).body.name, 'tasks')
  assert.equal((await call('GET', '/api/tasks?x=1')).body.name, 'tasks')
  assert.deepEqual((await call('PATCH', '/api/tasks/abc-1')).body, { name: 'task-id', params: { id: 'abc-1' } })
  assert.equal((await call('DELETE', '/api/completed-tasks/cleanup')).body.name, 'cleanup')
  assert.equal((await call('DELETE', '/api/completed-tasks/42')).body.name, 'ct-id')
})

test('405 for wrong method, 404 for unknown path', async () => {
  assert.equal((await call('DELETE', '/api/tasks/abc')).status, 405)
  assert.equal((await call('GET', '/api/nope')).status, 404)
})
