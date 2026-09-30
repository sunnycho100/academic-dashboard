import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Task } from './types.ts'
import { groupTasksByTime } from './task-groups.ts'

const now = new Date('2026-09-28T15:00:00')
const task = (id: string, dueAt: string | null): Task => ({
  id,
  userId: 'local',
  categoryId: 'c1',
  title: id,
  type: 'Assignment',
  dueAt,
  status: 'todo',
  priorityOrder: 0,
  createdAt: '2026-09-01T00:00:00Z',
})
const ids = (list: Task[]) => list.map((t) => t.id)

test('today holds the planned tasks in plan order, even if overdue', () => {
  const tasks = [task('a', '2026-09-30T12:00:00'), task('b', '2026-09-20T12:00:00'), task('c', null)]
  const groups = groupTasksByTime(tasks, ['b', 'a'], now)
  assert.deepEqual(ids(groups.today), ['b', 'a'])
  assert.deepEqual(ids(groups.overdue), [])
  assert.deepEqual(ids(groups.upcoming), ['c'])
})

test('overdue is anything due before today; due today and undated are upcoming', () => {
  const tasks = [
    task('late', '2026-09-27T23:59:00'),
    task('dueToday', '2026-09-28T08:00:00'),
    task('later', '2026-10-02T12:00:00'),
    task('undated', null),
  ]
  const groups = groupTasksByTime(tasks, [], now)
  assert.deepEqual(ids(groups.overdue), ['late'])
  assert.deepEqual(ids(groups.upcoming), ['dueToday', 'later', 'undated'])
})

test('today ids that are filtered out of the task list are skipped', () => {
  const groups = groupTasksByTime([task('a', null)], ['gone', 'a'], now)
  assert.deepEqual(ids(groups.today), ['a'])
})
