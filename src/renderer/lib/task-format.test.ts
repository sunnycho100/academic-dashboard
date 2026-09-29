import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMinutes, dueLabel, formatClock, courseSummary } from './task-format.ts'

test('formatMinutes', () => {
  assert.equal(formatMinutes(25), '25m')
  assert.equal(formatMinutes(60), '1h')
  assert.equal(formatMinutes(90), '1h 30m')
})

test('dueLabel relative to today', () => {
  const now = new Date('2026-09-28T15:00:00')
  assert.equal(dueLabel(null, now), null)
  assert.deepEqual(dueLabel('2026-09-26T09:00:00', now), { text: '2d late', late: true })
  assert.deepEqual(dueLabel('2026-09-28T23:00:00', now), { text: 'Today', late: false })
  assert.deepEqual(dueLabel('2026-09-29T08:00:00', now), { text: 'Tomorrow', late: false })
  assert.deepEqual(dueLabel('2026-10-01T08:00:00', now), { text: 'Thu', late: false })
  assert.deepEqual(dueLabel('2026-10-20T08:00:00', now), { text: 'Oct 20', late: false })
})

test('formatClock is H:MM:SS', () => {
  assert.equal(formatClock(0), '0:00:00')
  assert.equal(formatClock(2530), '0:42:10')
  assert.equal(formatClock(3 * 3600 + 5), '3:00:05')
})

test('courseSummary: overdue first, then next due, else nothing', () => {
  const now = new Date('2026-09-28T15:00:00')
  assert.equal(courseSummary([], now), 'Nothing due')
  assert.equal(courseSummary([{ dueAt: null }], now), 'Nothing due')
  assert.equal(courseSummary([{ dueAt: '2026-09-26T09:00:00' }, { dueAt: '2026-10-01T09:00:00' }], now), '1 overdue')
  assert.equal(
    courseSummary([{ dueAt: '2026-10-02T09:00:00' }, { dueAt: '2026-10-01T09:00:00' }, { dueAt: null }], now),
    '2 due · next Thu',
  )
  assert.equal(courseSummary([{ dueAt: '2026-09-29T09:00:00' }], now), '1 due · tomorrow')
})
