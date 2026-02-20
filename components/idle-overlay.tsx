'use client'

import { useEffect, useState, useRef } from 'react'
import { Moon, Play } from 'lucide-react'

// ── Storage keys (must match use-task-timer.ts & personal-dev-tracker.tsx) ──
const TASK_TIMER_KEY = 'class-catchup-timers'
const PERSONAL_DEV_KEY = 'personal-dev-timers'

interface RunningTimer {
  label: string
  segmentStartedAt: string
  color?: string
}

/** Read running timers from localStorage (no React tree needed). */
function getRunningTimers(): RunningTimer[] {
  const timers: RunningTimer[] = []

  // Task timers
  try {
    const raw = localStorage.getItem(TASK_TIMER_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      for (const [taskId, state] of Object.entries(data) as [string, any][]) {
        if (state?.isRunning && !state?.isPaused && state?.segmentStartedAt) {
          timers.push({
            label: state.taskTitle || `Task ${taskId.slice(0, 6)}`,
            segmentStartedAt: state.segmentStartedAt,
          })
        }
      }
    }
  } catch {}

  // Personal Dev timers
  try {
    const raw = localStorage.getItem(PERSONAL_DEV_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      const labels: Record<string, string> = {
        reading: 'Reading',
        project: 'Project',
        'job-application': 'Job App',
      }
      for (const [key, state] of Object.entries(data) as [string, any][]) {
        if (state?.isRunning && state?.segmentStartedAt) {
          timers.push({
            label: labels[key] || key,
            segmentStartedAt: state.segmentStartedAt,
          })
        }
      }
    }
  } catch {}

  return timers
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface IdleOverlayProps {
  onWakeUp: () => void
}

/**
 * Lightweight overlay shown during idle / power-save mode.
 *
 * - NO framer-motion, NO DnD, NO heavy component tree
 * - Single 60-second interval to update running timer display
 * - Pure CSS animations only
 * - Listens for any interaction to fire onWakeUp
 */
export function IdleOverlay({ onWakeUp }: IdleOverlayProps) {
  const [runningTimers, setRunningTimers] = useState<RunningTimer[]>([])
  const [elapsed, setElapsed] = useState<Record<string, number>>({})
  const wakeRef = useRef(false)

  // Load initial running timers
  useEffect(() => {
    const timers = getRunningTimers()
    setRunningTimers(timers)

    // Compute initial elapsed
    const now = Date.now()
    const e: Record<string, number> = {}
    timers.forEach((t, i) => {
      e[i] = Math.max(0, Math.floor((now - new Date(t.segmentStartedAt).getTime()) / 1000))
    })
    setElapsed(e)
  }, [])

  // Update elapsed every 60 seconds (very lightweight)
  useEffect(() => {
    const interval = setInterval(() => {
      const timers = getRunningTimers()
      setRunningTimers(timers)
      const now = Date.now()
      const e: Record<string, number> = {}
      timers.forEach((t, i) => {
        e[i] = Math.max(0, Math.floor((now - new Date(t.segmentStartedAt).getTime()) / 1000))
      })
      setElapsed(e)
    }, 60_000) // once per minute

    return () => clearInterval(interval)
  }, [])

  // Wake up on any interaction
  useEffect(() => {
    const handleWake = () => {
      if (wakeRef.current) return
      wakeRef.current = true
      onWakeUp()
    }

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    // Delay attaching listeners briefly so the initial mouse position
    // doesn't immediately trigger wake-up
    const timeout = setTimeout(() => {
      for (const event of events) {
        window.addEventListener(event, handleWake, { passive: true, once: true })
      }
    }, 500)

    return () => {
      clearTimeout(timeout)
      for (const event of events) {
        window.removeEventListener(event, handleWake)
      }
    }
  }, [onWakeUp])

  const hasTimers = runningTimers.length > 0

  return (
    <div className="idle-overlay">
      <div className="idle-overlay-bg" />

      <div className="idle-content">
        {/* Moon icon */}
        <div className="idle-icon">
          <Moon className="h-8 w-8" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="idle-title">Power Save Mode</h2>
        <p className="idle-subtitle">
          Dashboard paused to save energy
        </p>

        {/* Running timers indicator */}
        {hasTimers && (
          <div className="idle-timers">
            <div className="idle-timers-header">
              <span className="idle-pulse" />
              <span>Recording in progress</span>
            </div>
            <div className="idle-timers-list">
              {runningTimers.map((timer, i) => (
                <div key={i} className="idle-timer-row">
                  <Play className="h-3 w-3 idle-timer-icon" />
                  <span className="idle-timer-label">{timer.label}</span>
                  <span className="idle-timer-elapsed">
                    {formatElapsed(elapsed[i] || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume hint */}
        <p className="idle-hint">
          Move mouse or press any key to resume
        </p>
      </div>
    </div>
  )
}
