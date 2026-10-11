import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saveTimeRecord } from './save-time-record.ts'

const record = { taskId: null, taskTitle: 'Reading', categoryName: 'Personal Dev', categoryColor: '#000', taskType: 'Reading', startTime: '2026-10-11T13:00:00.000Z', endTime: '2026-10-11T13:10:00.000Z', duration: 600 }

test('a non-2xx answer is retried once, then given up', async (t) => {
  t.mock.method(console, 'error', () => {})
  const statuses = [500, 201]
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: statuses.shift() ?? 500 }))
  await saveTimeRecord(record)
  assert.equal(fetchMock.mock.callCount(), 2)

  fetchMock.mock.resetCalls()
  statuses.push(500, 500, 201)
  await saveTimeRecord(record)
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('a 2xx answer is not retried', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 201 }))
  await saveTimeRecord(record)
  assert.equal(fetchMock.mock.callCount(), 1)
})
