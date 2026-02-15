'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, BookOpen, FolderGit2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { loadPersonalDevColors, DEFAULT_PERSONAL_DEV_COLORS } from '@/components/color-scheme-dialog'

// ── Activity definitions ──────────────────────────────────────────

interface Activity {
  key: string
  label: string
  icon: React.ElementType
}

const ACTIVITY_DEFS: Activity[] = [
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'project', label: 'Project', icon: FolderGit2 },
  { key: 'job-application', label: 'Job App', icon: Briefcase },
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
  const [dbLoaded, setDbLoaded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // hydrate from localStorage, then overlay DB totals for today
  useEffect(() => {
    const local = load()
    setTimers(local)

    // Fetch today's Personal Dev records from DB to compute total elapsed
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const tzOffset = now.getTimezoneOffset()
    fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}`)
      .then((r) => r.json())
      .then((records: Array<{ taskTitle: string; categoryName: string; duration: number }>) => {
        if (!Array.isArray(records)) return
        // Sum duration per activity from DB records tagged as Personal Dev
        const dbTotals: Record<string, number> = {}
        for (const rec of records) {
          if (rec.categoryName !== 'Personal Dev') continue
          const actKey = ACTIVITY_DEFS.find((a) => a.label === rec.taskTitle)?.key
          if (actKey) {
            dbTotals[actKey] = (dbTotals[actKey] || 0) + rec.duration
          }
        }
        // Update timers: DB total is the source of truth for elapsed
        setTimers((prev) => {
          const next = { ...prev }
          for (const key of Object.keys(dbTotals)) {
            const existing = next[key]
            next[key] = {
              isRunning: existing?.isRunning ?? false,
              elapsedSeconds: dbTotals[key],
              segmentStartedAt: existing?.segmentStartedAt ?? null,
            }
          }
          return next
        })
        setDbLoaded(true)
      })
      .catch(() => setDbLoaded(true))
  }, [])

  // persist on every change (only after DB load to avoid clobbering)
  useEffect(() => { if (dbLoaded) save(timers) }, [timers, dbLoaded])

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
    const colors = loadPersonalDevColors()
    const actColor = colors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]
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
              actColor,
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
  const devColors = loadPersonalDevColors()

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
          {ACTIVITY_DEFS.map((activity) => {
            const timer = timers[activity.key]
            const running = timer?.isRunning ?? false
            const elapsed = timer?.elapsedSeconds ?? 0
            const Icon = activity.icon
            const color = devColors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]

            return (
              <motion.button
                key={activity.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(activity)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-all',
                  'border border-border/30 hover:border-border/60',
                  !running && 'bg-muted/30 hover:bg-muted/50',
                )}
                style={running ? { backgroundColor: color + '18' } : undefined}
              >
                {/* Icon + Play/Pause overlay */}
                <div className="relative flex-shrink-0">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: running ? color + '20' : undefined }}
                  >
                    <Icon
                      className={cn('h-4 w-4', !running && 'text-muted-foreground')}
                      style={running ? { color } : undefined}
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
                      !running && 'text-muted-foreground',
                    )}
                    style={running ? { color } : undefined}
                  >
                    {activity.label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold font-mono tabular-nums leading-tight',
                      running
                        ? 'animate-pulse'
                        : elapsed > 0
                          ? 'text-foreground'
                          : 'text-muted-foreground/40',
                    )}
                    style={running ? { color } : undefined}
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
