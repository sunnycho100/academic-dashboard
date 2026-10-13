import { test } from 'node:test'
import assert from 'node:assert/strict'
import { minuteAt, hhmm } from './plan.ts'

test('a drop point becomes a minute of the day, snapped to 15 minutes', () => {
  // Lane starts at 8 AM, 64px per hour
  assert.equal(minuteAt(0, 8), 8 * 60)
  assert.equal(minuteAt(64, 8), 9 * 60)
  assert.equal(minuteAt(80, 8), 9 * 60 + 15) // 9:15
  assert.equal(minuteAt(87, 8), 9 * 60 + 15) // 9:21 snaps back to 9:15
  assert.equal(minuteAt(-20, 0), 0)
})

test('hhmm writes Timetable times and wraps past midnight', () => {
  assert.equal(hhmm(9 * 60 + 15), '09:15')
  assert.equal(hhmm(25 * 60 + 30), '01:30')
  assert.equal(hhmm(0), '00:00')
})
