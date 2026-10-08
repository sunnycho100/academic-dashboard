import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, BookOpen, FolderGit2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { loadPersonalDevColors, DEFAULT_PERSONAL_DEV_COLORS } from '@/components/settings/color-scheme-dialog'

// ── Activity definitions ──────────────────────────────────────────

interface Activity {
  key: string
  label: string
  icon: React.ElementType
}

const ACTIVITY_DEFS: Activity[] = [
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'project', label: 'Research', icon: FolderGit2 },
  { key: 'job-application', label: 'Job App', icon: Briefcase },
]

// ── Timer state per activity ──────────────────────────────────────

interface ActivityTimer {
  isRunning: boolean
  /** ISO string – start of the current active segment (null if not running) */
  segmentStartedAt: string | null
}

type ActivityTimerData = Record<string, ActivityTimer>

/** DB totals per activity key (seconds) */
type DbTotals = Record<string, number>

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
  const [dbTotals, setDbTotals] = useState<DbTotals>({})
  const [tick, setTick] = useState(0) // forces re-render every second when running
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load running state from localStorage & fetch DB totals for today
  useEffect(() => {
    const local = load()
    // Only preserve running state, not elapsedSeconds
    const cleaned: ActivityTimerData = {}
    for (const key of Object.keys(local)) {
      cleaned[key] = {
        isRunning: local[key]?.isRunning ?? false,
        segmentStartedAt: local[key]?.segmentStartedAt ?? null,
      }
    }
    setTimers(cleaned)
  }, [])

  // Today's saved totals per activity. Re-read whenever a time record is added, edited
  // or deleted (timers here, or edits in Time records), so the tiles match the records.
  useEffect(() => {
    const loadTotals = () => {
      // Fetch today's Personal Dev records from DB to compute total elapsed
      const now = new Date()
      const tzOffset = now.getTimezoneOffset()
      // Use day boundaries from localStorage
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
      // If day extends past midnight (e.g. 10 AM–3 AM) and current time
      // is before the end-hour boundary, we're still in "yesterday's" logical day.
      let effectiveDate = now
      if (endHour > 24) {
        const pastMidnightEnd = endHour - 24
        if (now.getHours() < pastMidnightEnd) {
          effectiveDate = new Date(now)
          effectiveDate.setDate(effectiveDate.getDate() - 1)
        }
      }
      const dateStr = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveDate.getDate()).padStart(2, '0')}`
      const endHourParam = endHour > 24 ? endHour - 24 : 0
      fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${startHour}&endHour=${endHourParam}`)
        .then((r) => r.json())
        .then((records: Array<{ taskTitle: string; categoryName: string; duration: number }>) => {
          if (!Array.isArray(records)) return
          const totals: DbTotals = {}
          for (const rec of records) {
            if (rec.categoryName !== 'Personal Dev') continue
            // "Project" is the old name of Research; its earlier records still count there
            const title = rec.taskTitle === 'Project' ? 'Research' : rec.taskTitle
            const actKey = ACTIVITY_DEFS.find((a) => a.label === title)?.key
            if (actKey) {
              totals[actKey] = (totals[actKey] || 0) + rec.duration
            }
          }
          setDbTotals(totals)
        })
        .catch(() => {})
    }
    loadTotals()
    window.addEventListener('time-records-changed', loadTotals)
    return () => window.removeEventListener('time-records-changed', loadTotals)
  }, [])

  // Persist running state on change
  useEffect(() => { save(timers) }, [timers])

  // Tick every second when any timer is running (to update displayed live elapsed)
  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.isRunning)
    if (hasRunning) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timers])

  // Keep a ref mirror so side-effects can read latest state outside the setter
  const timersRef = useRef<ActivityTimerData>({})
  useEffect(() => { timersRef.current = timers }, [timers])

  /** Compute displayed seconds: DB total + live segment elapsed */
  const getDisplaySeconds = (key: string): number => {
    const db = dbTotals[key] || 0
    const timer = timers[key]
    if (timer?.isRunning && timer.segmentStartedAt) {
      const liveElapsed = Math.floor((Date.now() - new Date(timer.segmentStartedAt).getTime()) / 1000)
      return db + Math.max(0, liveElapsed)
    }
    return db
  }

  const toggle = useCallback((activity: Activity) => {
    const colors = loadPersonalDevColors()
    const actColor = colors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]

    // Read state from ref OUTSIDE the setter to avoid React StrictMode double-fire
    const current = timersRef.current[activity.key]

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
          // Update DB total locally so display stays accurate without refetch
          setDbTotals((prevTotals) => ({
            ...prevTotals,
            [activity.key]: (prevTotals[activity.key] || 0) + dur,
          }))
        }
      }
      setTimers((prev) => ({
        ...prev,
        [activity.key]: { isRunning: false, segmentStartedAt: null },
      }))
      return
    }

    // ── Not running → START / RESUME ────────────────────────
    setTimers((prev) => ({
      ...prev,
      [activity.key]: {
        isRunning: true,
        segmentStartedAt: new Date().toISOString(),
      },
    }))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const anyRunning = Object.values(timers).some((t) => t.isRunning)
  const devColors = loadPersonalDevColors()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative z-10 overflow-hidden"
    >
      <div className="px-6 py-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs tracking-wider uppercase text-today-muted">
            Personal Dev
          </p>
          {anyRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs text-today-muted">
              <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
              Active
            </span>
          )}
        </div>

        {/* 3 activity rows side-by-side */}
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_DEFS.map((activity) => {
            const timer = timers[activity.key]
            const running = timer?.isRunning ?? false
            const elapsed = getDisplaySeconds(activity.key)
            const Icon = activity.icon
            const color = devColors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]

            return (
              <motion.button
                key={activity.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(activity)}
                className={cn(
                  'flex min-w-0 flex-col items-start gap-1 rounded-xl px-3 py-2.5 transition-all',
                  'border border-white/10 hover:border-white/25',
                  running ? 'bg-white/[0.08]' : 'bg-white/[0.03]',
                )}
              >
                {/* Icon and name on one line, time under it, so nothing wraps in a narrow panel */}
                <span className="flex w-full min-w-0 items-center gap-1.5">
                  <Icon
                    className={cn('h-3.5 w-3.5 flex-shrink-0', !running && 'text-today-muted')}
                    style={running ? { color } : undefined}
                  />
                  <span
                    className={cn(
                      'truncate whitespace-nowrap text-[12px] font-medium leading-tight',
                      running ? 'text-white' : 'text-today-muted',
                    )}
                  >
                    {activity.label}
                  </span>
                </span>
                <span className="flex w-full items-center justify-between gap-1">
                  <span
                    className={cn(
                      'text-[13px] font-medium font-mono tabular-nums leading-tight',
                      running
                        ? 'text-white'
                        : elapsed > 0
                          ? 'text-today-foreground'
                          : 'text-today-muted/70',
                    )}
                  >
                    {fmt(elapsed)}
                  </span>
                  {running ? (
                    <Pause className="h-3 w-3 flex-shrink-0 fill-current text-coral" aria-hidden />
                  ) : (
                    <Play className="h-3 w-3 flex-shrink-0 text-today-muted" aria-hidden />
                  )}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
