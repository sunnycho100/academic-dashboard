'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  elapsedSeconds: number
}

interface TaskTimerData {
  [taskId: string]: TimerState
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

export function useTaskTimers(taskIds: string[]) {
  const [timerStates, setTimerStates] = useState<TaskTimerData>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load timer states on mount
  useEffect(() => {
    setTimerStates(loadTimerData())
  }, [])

  // Save timer states whenever they change
  useEffect(() => {
    saveTimerData(timerStates)
  }, [timerStates])

  // Increment elapsed time every second for running timers
  useEffect(() => {
    const hasRunningTimer = Object.values(timerStates).some(
      (state) => state.isRunning && !state.isPaused
    )

    if (hasRunningTimer) {
      intervalRef.current = setInterval(() => {
        setTimerStates((prev) => {
          const newState = { ...prev }
          Object.keys(newState).forEach((taskId) => {
            if (newState[taskId].isRunning && !newState[taskId].isPaused) {
              newState[taskId] = {
                ...newState[taskId],
                elapsedSeconds: newState[taskId].elapsedSeconds + 1,
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
    setTimerStates((prev) => ({
      ...prev,
      [taskId]: {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 0,
      },
    }))
  }, [])

  const pauseTimer = useCallback((taskId: string) => {
    setTimerStates((prev) => {
      const state = prev[taskId]
      if (!state || !state.isRunning || state.isPaused) return prev

      return {
        ...prev,
        [taskId]: {
          ...state,
          isPaused: true,
        },
      }
    })
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
        },
      }
    })
  }, [])

  const stopTimer = useCallback((taskId: string) => {
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
  }
}
