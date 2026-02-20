'use client'

import { useEffect, useState, useRef } from 'react'
import { Moon, Play, Zap } from 'lucide-react'

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

interface IdleOverlayProps {
  onWakeUp: () => void
}

/**
 * Lightweight overlay shown during idle / power-save mode.
 *
 * - NO framer-motion, NO DnD, NO heavy component tree
 * - Single 60-second interval to update running timer display & clock
 * - Pure CSS animations only
 * - Listens for any interaction to fire onWakeUp
 * - Glassmorphism design matching the dashboard aesthetic
 */
export function IdleOverlay({ onWakeUp }: IdleOverlayProps) {
  const [runningTimers, setRunningTimers] = useState<RunningTimer[]>([])
  const [elapsed, setElapsed] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => new Date())
  const wakeRef = useRef(false)

  // Load initial running timers
  useEffect(() => {
    const timers = getRunningTimers()
    setRunningTimers(timers)

    const nowMs = Date.now()
    const e: Record<string, number> = {}
    timers.forEach((t, i) => {
      e[i] = Math.max(0, Math.floor((nowMs - new Date(t.segmentStartedAt).getTime()) / 1000))
    })
    setElapsed(e)
  }, [])

  // Update elapsed & clock every 10 seconds — lightweight, keeps timer display accurate
  useEffect(() => {
    const interval = setInterval(() => {
      const timers = getRunningTimers()
      setRunningTimers(timers)
      const nowMs = Date.now()
      const e: Record<string, number> = {}
      timers.forEach((t, i) => {
        e[i] = Math.max(0, Math.floor((nowMs - new Date(t.segmentStartedAt).getTime()) / 1000))
      })
      setElapsed(e)
      setNow(new Date())
    }, 10_000)

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
      {/* Mesh gradient background — same as dashboard */}
      <div className="idle-mesh-bg" />

      {/* Ambient floating orbs */}
      <div className="idle-orb idle-orb-1" />
      <div className="idle-orb idle-orb-2" />
      <div className="idle-orb idle-orb-3" />

      <div className="idle-layout">
        {/* Clock section */}
        <div className="idle-clock-section">
          <time className="idle-clock">{formatTime(now)}</time>
          <p className="idle-date">{formatDate(now)}</p>
        </div>

        {/* Glass card */}
        <div className="idle-glass-card">
          {/* Status badge */}
          <div className="idle-status-badge">
            <Zap className="h-3.5 w-3.5" />
            <span>Power Save</span>
          </div>

          {/* Running timers */}
          {hasTimers && (
            <div className="idle-timers">
              <div className="idle-timers-header">
                <span className="idle-pulse" />
                <span>Timers running</span>
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

          {!hasTimers && (
            <div className="idle-paused-info">
              <Moon className="h-5 w-5 idle-moon-icon" />
              <p className="idle-paused-text">No active timers</p>
            </div>
          )}
        </div>

        {/* Resume hint */}
        <p className="idle-hint">
          Move mouse or press any key to resume
        </p>
      </div>
    </div>
  )
}
