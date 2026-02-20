'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  elapsedSeconds: number
  /** ISO string — when the current active segment started */
  segmentStartedAt: string | null
  /** ISO string — last time the 1-second tick updated this timer.
   *  Used to reconcile elapsed time after idle / unmount gaps. */
  lastTickAt?: string | null
  /** Persisted task title for display during idle / power-save mode */
  taskTitle?: string
}

interface TaskTimerData {
  [taskId: string]: TimerState
}

export interface TaskMeta {
  taskId: string
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
}

const STORAGE_KEY = 'class-catchup-timers'

function loadTimerData(): TaskTimerData {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveTimerData(data: TaskTimerData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

/** Persist a time record segment to the backend */
async function saveTimeRecord(
  meta: TaskMeta,
  startTime: string,
  endTime: string,
  durationSeconds: number
) {
  try {
    await fetch('/api/time-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: meta.taskId,
        taskTitle: meta.taskTitle,
        categoryName: meta.categoryName,
        categoryColor: meta.categoryColor,
        taskType: meta.taskType,
        startTime,
        endTime,
        duration: durationSeconds,
      }),
    })
  } catch (err) {
    console.error('Failed to save time record:', err)
  }
}

export function useTaskTimers(taskIds: string[]) {
  const [timerStates, setTimerStates] = useState<TaskTimerData>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // Keep a ref mirror so side-effects can read latest state outside the setter
  const timerStatesRef = useRef<TaskTimerData>({})
  useEffect(() => { timerStatesRef.current = timerStates }, [timerStates])
  // Map of taskId → TaskMeta for persisting records
  const taskMetaRef = useRef<Record<string, TaskMeta>>({})
  // Guard: don't save to localStorage until we've loaded first
  const loadedRef = useRef(false)

  // Load timer states on mount — reconcile elapsed for any running timers
  // that accumulated time while the component was unmounted (idle mode, tab close, etc.)
  useEffect(() => {
    const loaded = loadTimerData()
    const now = Date.now()
    const reconciled: TaskTimerData = {}
    for (const [taskId, state] of Object.entries(loaded)) {
      if (state.isRunning && !state.isPaused && state.lastTickAt) {
        const lastTick = new Date(state.lastTickAt).getTime()
        const missedSeconds = Math.max(0, Math.floor((now - lastTick) / 1000))
        if (missedSeconds > 2) {
          // Timer was running during a gap — add the missed time
          reconciled[taskId] = {
            ...state,
            elapsedSeconds: state.elapsedSeconds + missedSeconds,
            lastTickAt: new Date(now).toISOString(),
          }
          continue
        }
      }
      reconciled[taskId] = state
    }
    loadedRef.current = true
    setTimerStates(reconciled)
  }, [])

  // Save timer states whenever they change — but only after initial load
  // to prevent overwriting localStorage with {} on mount
  useEffect(() => {
    if (!loadedRef.current) return
    saveTimerData(timerStates)
  }, [timerStates])

  // Flush running timer segments to DB on page unload / tab close
  // so time is never silently lost
  useEffect(() => {
    const handleBeforeUnload = () => {
      const states = timerStatesRef.current
      const metas = taskMetaRef.current
      for (const [taskId, state] of Object.entries(states)) {
        if (state.isRunning && !state.isPaused && state.segmentStartedAt) {
          const endTime = new Date().toISOString()
          const dur = Math.round(
            (new Date(endTime).getTime() - new Date(state.segmentStartedAt).getTime()) / 1000
          )
          const meta = metas[taskId]
          if (meta && dur > 0) {
            // Use sendBeacon for reliable delivery during unload
            const blob = new Blob([JSON.stringify({
              taskId: meta.taskId,
              taskTitle: meta.taskTitle,
              categoryName: meta.categoryName,
              categoryColor: meta.categoryColor,
              taskType: meta.taskType,
              startTime: state.segmentStartedAt,
              endTime,
              duration: dur,
            })], { type: 'application/json' })
            navigator.sendBeacon('/api/time-records', blob)
            // Update localStorage so the timer starts a fresh segment on reload
            // instead of double-counting this segment
            const updated = { ...states }
            updated[taskId] = {
              ...state,
              segmentStartedAt: endTime,
              lastTickAt: endTime,
            }
            saveTimerData(updated)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Increment elapsed time every second for running timers
  useEffect(() => {
    const hasRunningTimer = Object.values(timerStates).some(
      (state) => state.isRunning && !state.isPaused
    )

    if (hasRunningTimer) {
      intervalRef.current = setInterval(() => {
        const tickTime = new Date().toISOString()
        setTimerStates((prev) => {
          const newState = { ...prev }
          Object.keys(newState).forEach((taskId) => {
            if (newState[taskId].isRunning && !newState[taskId].isPaused) {
              newState[taskId] = {
                ...newState[taskId],
                elapsedSeconds: newState[taskId].elapsedSeconds + 1,
                lastTickAt: tickTime,
              }
            }
          })
          return newState
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerStates])

  /** Register metadata for a task so time records can include it */
  const registerTaskMeta = useCallback((meta: TaskMeta) => {
    taskMetaRef.current[meta.taskId] = meta
  }, [])

  const getElapsedSeconds = useCallback(
    (taskId: string): number => {
      const state = timerStates[taskId]
      return state?.elapsedSeconds || 0
    },
    [timerStates]
  )

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }, [])

  const startTimer = useCallback((taskId: string) => {
    const meta = taskMetaRef.current[taskId]
    setTimerStates((prev) => ({
      ...prev,
      [taskId]: {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 0,
        segmentStartedAt: new Date().toISOString(),
        lastTickAt: new Date().toISOString(),
        taskTitle: meta?.taskTitle || 'Task',
      },
    }))
  }, [])

  const pauseTimer = useCallback((taskId: string) => {
    // Read state from ref (outside setter) so the side-effect runs exactly once
    const state = timerStatesRef.current[taskId]
    if (!state || !state.isRunning || state.isPaused) return

    // Save segment record OUTSIDE the state updater to avoid React StrictMode double-fire
    const endTime = new Date().toISOString()
    if (state.segmentStartedAt) {
      const segmentDuration = Math.round(
        (new Date(endTime).getTime() - new Date(state.segmentStartedAt).getTime()) / 1000
      )
      const meta = taskMetaRef.current[taskId]
      if (meta && segmentDuration > 0) {
        saveTimeRecord(meta, state.segmentStartedAt, endTime, segmentDuration)
      }
    }

    setTimerStates((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        isPaused: true,
        segmentStartedAt: null,
      },
    }))
  }, [])

  const resumeTimer = useCallback((taskId: string) => {
    setTimerStates((prev) => {
      const state = prev[taskId]
      if (!state || !state.isPaused) return prev

      return {
        ...prev,
        [taskId]: {
          ...state,
          isPaused: false,
          segmentStartedAt: new Date().toISOString(),
        },
      }
    })
  }, [])

  const stopTimer = useCallback((taskId: string) => {
    // Read state from ref (outside setter) so the side-effect runs exactly once
    const state = timerStatesRef.current[taskId]
    if (state?.isRunning && !state.isPaused && state.segmentStartedAt) {
      const endTime = new Date().toISOString()
      const segmentDuration = Math.round(
        (new Date(endTime).getTime() - new Date(state.segmentStartedAt).getTime()) / 1000
      )
      const meta = taskMetaRef.current[taskId]
      if (meta && segmentDuration > 0) {
        saveTimeRecord(meta, state.segmentStartedAt, endTime, segmentDuration)
      }
    }

    setTimerStates((prev) => {
      const newState = { ...prev }
      delete newState[taskId]
      return newState
    })
  }, [])

  const resetTimer = useCallback((taskId: string) => {
    setTimerStates((prev) => {
      const newState = { ...prev }
      delete newState[taskId]
      return newState
    })
  }, [])

  const getTotalStudyTime = useCallback((): number => {
    return taskIds.reduce((total, taskId) => {
      return total + getElapsedSeconds(taskId)
    }, 0)
  }, [taskIds, getElapsedSeconds])

  return {
    timerStates,
    getElapsedSeconds,
    formatTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    getTotalStudyTime,
    registerTaskMeta,
  }
}
