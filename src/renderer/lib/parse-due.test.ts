import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDue } from './parse-due.ts'

// Wednesday, Sep 30 2026
const now = new Date('2026-09-30T15:00:00')
const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null)
const p = (s: string) => ymd(parseDue(s, now))

test('relative words', () => {
  assert.equal(p('today'), '2026-9-30')
  assert.equal(p('tod'), '2026-9-30')
  assert.equal(p('Tomorrow'), '2026-10-1')
  assert.equal(p('tmr'), '2026-10-1')
  assert.equal(p('next week'), '2026-10-7')
  assert.equal(p('in 3 days'), '2026-10-3')
  assert.equal(p('3d'), '2026-10-3')
  assert.equal(p('in 2 weeks'), '2026-10-14')
})

test('weekdays are the next one, never today', () => {
  assert.equal(p('fri'), '2026-10-2')
  assert.equal(p('friday'), '2026-10-2')
  assert.equal(p('wed'), '2026-10-7')
  assert.equal(p('next mon'), '2026-10-5')
})

test('calendar dates roll into next year once past', () => {
  assert.equal(p('oct 5'), '2026-10-5')
  assert.equal(p('5 oct'), '2026-10-5')
  assert.equal(p('October 12'), '2026-10-12')
  assert.equal(p('10/5'), '2026-10-5')
  assert.equal(p('sep 1'), '2027-9-1')
  assert.equal(p('12'), '2026-10-12')
  assert.equal(p('30'), '2026-9-30')
})

test('nonsense is null', () => {
  assert.equal(p(''), null)
  assert.equal(p('banana'), null)
  assert.equal(p('feb 31'), null)
  assert.equal(p('13/40'), null)
})
