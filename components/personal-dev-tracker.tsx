'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, BookOpen, FolderGit2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── Activity definitions ──────────────────────────────────────────

interface Activity {
  key: string
  label: string
  icon: React.ElementType
  color: string        // tailwind-compatible accent
  bgActive: string     // bg class while timer running
  textColor: string
}

const ACTIVITIES: Activity[] = [
  {
    key: 'reading',
    label: 'Reading',
    icon: BookOpen,
    color: '#f59e0b',
    bgActive: 'bg-amber-500/15',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'project',
    label: 'Project',
    icon: FolderGit2,
    color: '#8b5cf6',
    bgActive: 'bg-violet-500/15',
    textColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'job-application',
    label: 'Job App',
    icon: Briefcase,
    color: '#06b6d4',
    bgActive: 'bg-cyan-500/15',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
]

// ── Timer state per activity ──────────────────────────────────────

interface ActivityTimer {
  isRunning: boolean
  elapsedSeconds: number
  /** ISO string – start of the current active segment */
  segmentStartedAt: string | null
}

type ActivityTimerData = Record<string, ActivityTimer>

const STORAGE_KEY = 'personal-dev-timers'

function load(): ActivityTimerData {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data: ActivityTimerData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

/** POST a time-record so it shows up in the Time Records dialog */
async function saveTimeRecord(
  activityKey: string,
  activityLabel: string,
  activityColor: string,
  startTime: string,
  endTime: string,
  durationSeconds: number,
) {
  try {
    await fetch('/api/time-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: null,
        taskTitle: activityLabel,
        categoryName: 'Personal Dev',
        categoryColor: activityColor,
        taskType: activityLabel,
        startTime,
        endTime,
        duration: durationSeconds,
      }),
    })
  } catch (err) {
    console.error('Failed to save personal-dev time record:', err)
  }
}

// ── Formatting helper ─────────────────────────────────────────────

function fmt(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────

export function PersonalDevTracker() {
  const [timers, setTimers] = useState<ActivityTimerData>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // hydrate from localStorage
  useEffect(() => { setTimers(load()) }, [])

  // persist on every change
  useEffect(() => { save(timers) }, [timers])

  // tick running timers every second
  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.isRunning)
    if (hasRunning) {
      intervalRef.current = setInterval(() => {
        setTimers((prev) => {
          const next = { ...prev }
          for (const key of Object.keys(next)) {
            if (next[key].isRunning) {
              next[key] = { ...next[key], elapsedSeconds: next[key].elapsedSeconds + 1 }
            }
          }
          return next
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timers])

  const toggle = useCallback((activity: Activity) => {
    setTimers((prev) => {
      const current = prev[activity.key]

      // ── Currently running → PAUSE ───────────────────────────
      if (current?.isRunning) {
        const endTime = new Date().toISOString()
        if (current.segmentStartedAt) {
          const dur = Math.round(
            (new Date(endTime).getTime() - new Date(current.segmentStartedAt).getTime()) / 1000,
          )
          if (dur > 0) {
            saveTimeRecord(
              activity.key,
              activity.label,
              activity.color,
              current.segmentStartedAt,
              endTime,
              dur,
            )
          }
        }
        return {
          ...prev,
          [activity.key]: { ...current, isRunning: false, segmentStartedAt: null },
        }
      }

      // ── Not running → START / RESUME ────────────────────────
      return {
        ...prev,
        [activity.key]: {
          isRunning: true,
          elapsedSeconds: current?.elapsedSeconds ?? 0,
          segmentStartedAt: new Date().toISOString(),
        },
      }
    })
  }, [])

  const anyRunning = Object.values(timers).some((t) => t.isRunning)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative z-10 border-t border-border/20 overflow-hidden"
    >
      <div className="px-4 py-3 bg-background/30 backdrop-blur-sm">
        {/* Section header */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Personal Dev
          </p>
          {anyRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          )}
        </div>

        {/* 3 activity rows side-by-side */}
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITIES.map((activity) => {
            const timer = timers[activity.key]
            const running = timer?.isRunning ?? false
            const elapsed = timer?.elapsedSeconds ?? 0
            const Icon = activity.icon

            return (
              <motion.button
                key={activity.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(activity)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-all',
                  'border border-border/30 hover:border-border/60',
                  running ? activity.bgActive : 'bg-muted/30 hover:bg-muted/50',
                )}
              >
                {/* Icon + Play/Pause overlay */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                      running ? activity.bgActive : 'bg-muted/60',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4', running ? activity.textColor : 'text-muted-foreground')}
                    />
                  </div>
                  {/* Play / Pause badge */}
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border border-background',
                      running
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground/60',
                    )}
                  >
                    {running ? (
                      <Pause className="h-2 w-2 fill-current" />
                    ) : (
                      <Play className="h-2 w-2 ml-[0.5px]" />
                    )}
                  </div>
                </div>

                {/* Label + Timer stacked */}
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-[11px] font-medium leading-tight',
                      running ? activity.textColor : 'text-muted-foreground',
                    )}
                  >
                    {activity.label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold font-mono tabular-nums leading-tight',
                      running
                        ? cn(activity.textColor, 'animate-pulse')
                        : elapsed > 0
                          ? 'text-foreground'
                          : 'text-muted-foreground/40',
                    )}
                  >
                    {fmt(elapsed)}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
