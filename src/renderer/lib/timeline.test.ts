import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plannedBlocks, actualBlocks, timelineRange } from './timeline.ts'

test('plannedBlocks parses HH:MM, skips blank rows, wraps past midnight', () => {
  const blocks = plannedBlocks([
    { id: 'a', plannedStart: '13:00', plannedEnd: '13:45', activityName: 'Lecture 12' },
    { id: 'b', plannedStart: '', plannedEnd: '', activityName: '' },
    { id: 'c', plannedStart: '23:30', plannedEnd: '00:30', activityName: 'Late read' },
  ])
  assert.deepEqual(
    blocks.map((b) => [b.id, b.startMin, b.endMin, b.label]),
    [
      ['a', 780, 825, 'Lecture 12'],
      ['c', 1410, 1470, 'Late read'],
    ],
  )
})

test('actualBlocks measures minutes from the local midnight of the day', () => {
  const day = new Date(2026, 8, 28)
  const at = (h: number, m: number) => new Date(2026, 8, 28, h, m).toISOString()
  const blocks = actualBlocks(
    [{ id: 'r1', taskTitle: 'HW 4', categoryColor: '#d9822b', startTime: at(14, 0), endTime: at(14, 42) }],
    day,
  )
  assert.deepEqual(blocks.map((b) => [b.startMin, b.endMin, b.color]), [[840, 882, '#d9822b']])
})

test('timelineRange covers blocks and now, whole hours, at least 4 hours', () => {
  const b = (startMin: number, endMin: number) => ({ id: 'x', label: '', startMin, endMin })
  assert.deepEqual(timelineRange([b(780, 825), b(840, 915)], 870), { startHour: 13, endHour: 17 })
  assert.deepEqual(timelineRange([], 9 * 60 + 10), { startHour: 8, endHour: 12 })
  assert.deepEqual(timelineRange([b(1410, 1470)], 1400), { startHour: 22, endHour: 26 })
})
