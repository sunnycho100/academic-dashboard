import { useEffect, useState } from 'react'
import type { Task, Category } from '@/lib/types'
import { useTaskTimers } from '@/hooks/use-task-timer'

/** Local YYYY-MM-DD of the current "logical" day, honoring the Time Records day boundaries. */
export function logicalToday(now = new Date()): { date: string; startHour: number; endHour: number } {
  let startHour = 6
  let endHour = 24
  try {
    const saved = localStorage.getItem('timeRecords-dayBoundaries')
    if (saved) {
      const { start, end } = JSON.parse(saved)
      if (typeof start === 'number') startHour = start
      if (typeof end === 'number') endHour = end
    }
  } catch {}
  // If the day extends past midnight (e.g. 10 AM to 3 AM) and it is before the end
  // boundary, we are still in yesterday's day.
  let effective = now
  if (endHour > 24 && now.getHours() < endHour - 24) {
    effective = new Date(now)
    effective.setDate(effective.getDate() - 1)
  }
  const date = `${effective.getFullYear()}-${String(effective.getMonth() + 1).padStart(2, '0')}-${String(effective.getDate()).padStart(2, '0')}`
  return { date, startHour, endHour }
}

/**
 * Timers for Today's plan plus today's recorded study time. Shared by the Today
 * group in the task list (play and pause per row) and the Today panel (focus timer).
 */
export function useTodaySession(todayTasks: Task[], categories: Category[], userId?: string) {
  const timers = useTaskTimers(todayTasks.map((t) => t.id), userId)
  const { registerTaskMeta, getTotalStudyTime } = timers
  const [dbStudySeconds, setDbStudySeconds] = useState(0)

  // Register task metadata so time records include category info
  useEffect(() => {
    todayTasks.forEach((task) => {
      const cat = categories.find((c) => c.id === task.categoryId)
      registerTaskMeta({
        taskId: task.id,
        taskTitle: task.title,
        categoryName: cat?.name ?? 'Unknown',
        categoryColor: cat?.color ?? '#888',
        taskType: task.type,
      })
    })
  }, [todayTasks, categories, registerTaskMeta])

  // Today's total from all time records, polled so it stays fresh
  useEffect(() => {
    const fetchStudyTime = () => {
      const { date, startHour, endHour } = logicalToday()
      const tz = new Date().getTimezoneOffset()
      const endHourParam = endHour > 24 ? endHour - 24 : 0
      fetch(`/api/time-records?date=${date}&tz=${tz}&startHour=${startHour}&endHour=${endHourParam}`)
        .then((res) => res.json())
        .then((records: Array<{ duration: number }>) => {
          if (Array.isArray(records)) setDbStudySeconds(records.reduce((sum, r) => sum + r.duration, 0))
        })
        .catch(() => {})
    }
    fetchStudyTime()
    const poll = setInterval(fetchStudyTime, 30000)
    return () => clearInterval(poll)
  }, [todayTasks]) // re-fetch when today's tasks change (e.g. after completing one)

  return { ...timers, totalStudySeconds: dbStudySeconds + getTotalStudyTime() }
}

export type TodaySession = ReturnType<typeof useTodaySession>
