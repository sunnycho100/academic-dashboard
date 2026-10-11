import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentDayStart, dayBoundaries, isLogicalToday, logicalDate, logicalToday, rolloverHour, timeRecordsDayQuery } from './day.ts'

const withBoundaries = (value: string | null, fn: () => void) => {
  const store = { getItem: (k: string) => (k === 'timeRecords-dayBoundaries' ? value : null) }
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true })
  try {
    fn()
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
  }
}

test('day boundaries default to 6 AM to midnight and read the Time records setting', () => {
  withBoundaries(null, () => assert.deepEqual(dayBoundaries(), { startHour: 6, endHour: 24 }))
  withBoundaries('{"start":10,"end":27}', () => assert.deepEqual(dayBoundaries(), { startHour: 10, endHour: 27 }))
  withBoundaries('{"start":"x"}', () => assert.deepEqual(dayBoundaries(), { startHour: 6, endHour: 24 }))
  withBoundaries('not json', () => assert.deepEqual(dayBoundaries(), { startHour: 6, endHour: 24 }))
  // No storage at all (e.g. Node) also falls back
  assert.deepEqual(dayBoundaries(), { startHour: 6, endHour: 24 })
})

test('the rollover is midnight unless the day runs past it', () => {
  assert.equal(rolloverHour(24), 0)
  assert.equal(rolloverHour(27), 3)
  withBoundaries('{"start":10,"end":26}', () => assert.equal(rolloverHour(), 2))
})

test('before the rollover the logical day is still yesterday', () => {
  const at = (s: string, end: number) => logicalDate(new Date(s), end).toDateString()
  assert.equal(at('2026-10-11T01:30:00', 24), new Date('2026-10-11T12:00:00').toDateString())
  assert.equal(at('2026-10-11T01:30:00', 27), new Date('2026-10-10T12:00:00').toDateString())
  assert.equal(at('2026-10-11T03:00:00', 27), new Date('2026-10-11T12:00:00').toDateString())
  assert.equal(isLogicalToday(new Date('2026-10-10T09:00:00'), 27, new Date('2026-10-11T01:30:00')), true)
  assert.equal(isLogicalToday(new Date('2026-10-11T09:00:00'), 27, new Date('2026-10-11T01:30:00')), false)
  withBoundaries('{"start":10,"end":27}', () =>
    assert.deepEqual(logicalToday(new Date('2026-10-01T02:00:00')), { date: '2026-09-30', startHour: 10, endHour: 27 }),
  )
})

test('currentDayStart is the most recent rollover', () => {
  const at = (s: string, hour: number) => currentDayStart(new Date(s), hour).toISOString()
  const iso = (s: string) => new Date(s).toISOString()
  // Midnight rollover: 2 AM already belongs to the new day
  assert.equal(at('2026-09-30T02:00:00', 0), iso('2026-09-30T00:00:00'))
  assert.equal(at('2026-09-30T15:00:00', 0), iso('2026-09-30T00:00:00'))
  // Day ending at 2 AM: 1 AM is still yesterday, 3 AM is the new day
  assert.equal(at('2026-09-30T01:00:00', 2), iso('2026-09-29T02:00:00'))
  assert.equal(at('2026-09-30T03:00:00', 2), iso('2026-09-30T02:00:00'))
})

test('the time-records query asks for one logical day', () => {
  const tz = new Date().getTimezoneOffset()
  assert.equal(timeRecordsDayQuery('2026-10-11', 6, 24), `date=2026-10-11&tz=${tz}&startHour=6&endHour=0`)
  assert.equal(timeRecordsDayQuery('2026-10-11', 10, 27), `date=2026-10-11&tz=${tz}&startHour=10&endHour=3`)
})
