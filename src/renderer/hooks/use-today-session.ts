import { useEffect, useState } from 'react'
import type { Task, Category } from '@/lib/types'
import { useTaskTimers } from '@/hooks/use-task-timer'
import { logicalToday, timeRecordsDayQuery } from '@/lib/day'

/**
 * Timers for Today's plan plus today's recorded study time. Shared by the Today
 * group in the task list (play and pause per row) and the Today panel (focus timer).
 */
export function useTodaySession(todayTasks: Task[], categories: Category[], userId?: string) {
  const timers = useTaskTimers(todayTasks.map((t) => t.id), userId)
  const { registerTaskMeta, getTotalStudyTime, timerStates } = timers
  const [dbStudySeconds, setDbStudySeconds] = useState(0)
  // Seconds already saved today per task, so the timer display matches the database
  const [savedByTask, setSavedByTask] = useState<Record<string, number>>({})

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
      fetch(`/api/time-records?${timeRecordsDayQuery(date, startHour, endHour)}`)
        .then((res) => res.json())
        .then((records: Array<{ duration: number }>) => {
          if (Array.isArray(records)) setDbStudySeconds(records.reduce((sum, r) => sum + r.duration, 0))
        })
        .catch(() => {})
      // Each planned task's saved time on any day, so a session that crosses midnight
      // keeps its count and finishing the task records all of it
      const ids = todayTasks.map((t) => t.id).join(',')
      if (!ids) return setSavedByTask({})
      fetch(`/api/time-records?taskIds=${ids}`)
        .then((res) => res.json())
        .then((records: Array<{ duration: number; taskId: string | null }>) => {
          if (!Array.isArray(records)) return
          const byTask: Record<string, number> = {}
          for (const r of records) if (r.taskId) byTask[r.taskId] = (byTask[r.taskId] ?? 0) + r.duration
          setSavedByTask(byTask)
        })
        .catch(() => {})
    }
    fetchStudyTime()
    const poll = setInterval(fetchStudyTime, 30000)
    window.addEventListener('time-records-changed', fetchStudyTime)
    return () => {
      clearInterval(poll)
      window.removeEventListener('time-records-changed', fetchStudyTime)
    }
  }, [todayTasks]) // re-fetch when today's tasks change (e.g. after completing one)

  /**
   * A task's time: its saved segments (any day) plus the one running now. Derived from the
   * records rather than a separate counter, so a bad count can never stick around.
   */
  const getElapsedSeconds = (taskId: string): number => {
    const state = timerStates[taskId]
    const live =
      state?.isRunning && !state.isPaused && state.segmentStartedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(state.segmentStartedAt).getTime()) / 1000))
        : 0
    return (savedByTask[taskId] ?? 0) + live
  }

  return { ...timers, getElapsedSeconds, totalStudySeconds: dbStudySeconds + getTotalStudyTime() }
}

export type TodaySession = ReturnType<typeof useTodaySession>
