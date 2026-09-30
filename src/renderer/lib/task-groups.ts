import type { Task } from './types'

export interface TaskGroups {
  /** Tasks in Today's plan, in plan order */
  today: Task[]
  /** Not in today, due before the start of today */
  overdue: Task[]
  /** Everything else, in the incoming (sorted) order */
  upcoming: Task[]
}

export function groupTasksByTime(tasks: Task[], todayIds: string[], now = new Date()): TaskGroups {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const today = todayIds.map((id) => byId.get(id)).filter((t): t is Task => t !== undefined)
  const inToday = new Set(todayIds)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const overdue: Task[] = []
  const upcoming: Task[] = []
  for (const task of tasks) {
    if (inToday.has(task.id)) continue
    if (task.dueAt && new Date(task.dueAt).getTime() < startOfToday.getTime()) overdue.push(task)
    else upcoming.push(task)
  }
  return { today, overdue, upcoming }
}
