import type { Task } from './types'

export interface TaskGroups {
  /** Tasks in Today's plan, in plan order */
  today: Task[]
  /** Not in today, due before the start of today */
  overdue: Task[]
  /** Not in today, due during today */
  dueToday: Task[]
  /** Everything else, in the incoming (sorted) order */
  upcoming: Task[]
}

export function groupTasksByTime(tasks: Task[], todayIds: string[], now = new Date()): TaskGroups {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const today = todayIds.map((id) => byId.get(id)).filter((t): t is Task => t !== undefined)
  const inToday = new Set(todayIds)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const overdue: Task[] = []
  const dueToday: Task[] = []
  const upcoming: Task[] = []
  for (const task of tasks) {
    if (inToday.has(task.id)) continue
    const due = task.dueAt ? new Date(task.dueAt).getTime() : null
    if (due !== null && due < startOfToday.getTime()) overdue.push(task)
    else if (due !== null && due < startOfTomorrow.getTime()) dueToday.push(task)
    else upcoming.push(task)
  }
  return { today, overdue, dueToday, upcoming }
}
