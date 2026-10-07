import { useEffect, useRef, useState } from 'react'
import type { Task, Category } from '@/lib/types'
import type { TodaySession } from '@/hooks/use-today-session'
import { logicalToday } from '@/hooks/use-today-session'
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { plannedBlocks, actualBlocks, timelineRange, type TimelineBlock } from '@/lib/timeline'

type Lanes = 'both' | 'planned' | 'actual'
const LANES_KEY = 'timeline-lanes'
const HOUR_PX = 64
const RULER_PX = 44
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** Minutes from the day's midnight as "4:56 PM" (wraps past midnight) */
const clock = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function loadLanes(): Lanes {
  try {
    const v = localStorage.getItem(LANES_KEY)
    if (v === 'both' || v === 'planned' || v === 'actual') return v
  } catch {}
  return 'both'
}

const hourLabel = (h: number) => {
  const h24 = h % 24
  return `${h24 % 12 === 0 ? 12 : h24 % 12} ${h24 < 12 ? 'AM' : 'PM'}`
}

interface DayTimelineProps {
  tasks: Task[]
  categories: Category[]
  session: TodaySession
  onOpenTimetable: () => void
}

/** Today's hour ruler: planned Timetable entries next to actually tracked time, with a coral "now" line. */
export function DayTimeline({ tasks, categories, session, onOpenTimetable }: DayTimelineProps) {
  const [lanes, setLanes] = useState<Lanes>(loadLanes)
  const [planned, setPlanned] = useState<TimelineBlock[]>([])
  const [actual, setActual] = useState<TimelineBlock[]>([])
  const [now, setNow] = useState(() => new Date())
  // 0 is today, -1 yesterday; the arrows in the header move it
  const [dayOffset, setDayOffset] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolledRef = useRef(false)

  // The day being shown, as yyyy-mm-dd
  const shownDate = (() => {
    const [y, m, d] = logicalToday(now).date.split('-').map(Number)
    const day = new Date(y, m - 1, d + dayOffset)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  })()

  // Fetch both lanes; poll so edits in other tabs and finished segments show up
  useEffect(() => {
    const load = () => {
      const { startHour, endHour } = logicalToday()
      const date = shownDate
      const tz = new Date().getTimezoneOffset()
      const endHourParam = endHour > 24 ? endHour - 24 : 0
      const [y, m, d] = date.split('-').map(Number)
      fetch(`/api/timetable?date=${date}`)
        .then((r) => r.json())
        .then((rows) => Array.isArray(rows) && setPlanned(plannedBlocks(rows)))
        .catch(() => {})
      fetch(`/api/time-records?date=${date}&tz=${tz}&startHour=${startHour}&endHour=${endHourParam}`)
        .then((r) => r.json())
        .then((rows) => Array.isArray(rows) && setActual(actualBlocks(rows, new Date(y, m - 1, d))))
        .catch(() => {})
      setNow(new Date())
    }
    load()
    const poll = setInterval(load, 30_000)
    // Saved segments (task timers, Personal dev) show up immediately
    window.addEventListener('time-records-changed', load)
    return () => {
      clearInterval(poll)
      window.removeEventListener('time-records-changed', load)
    }
  }, [tasks, shownDate])

  // Minutes are measured from midnight of the logical day, so a day that runs past
  // midnight (Time Records day boundaries) keeps counting up past 24:00.
  const [ly, lm, ld] = shownDate.split('-').map(Number)
  const midnight = new Date(ly, lm - 1, ld).getTime()
  const isToday = dayOffset === 0
  // The running segment is drawn live from the timer state
  const nowMin = Math.round((now.getTime() - midnight) / 60_000)
  const live: TimelineBlock[] = !isToday ? [] : tasks.flatMap((task) => {
    const state = session.timerStates[task.id]
    if (!state?.isRunning || state.isPaused || !state.segmentStartedAt) return []
    const startMin = Math.round((new Date(state.segmentStartedAt).getTime() - midnight) / 60_000)
    const color = categories.find((c) => c.id === task.categoryId)?.color
    return [{ id: `live-${task.id}`, label: task.title, startMin, endMin: Math.max(nowMin, startMin + 1), color, live: true }]
  })
  const actualAll = [...actual, ...live]

  const shown = [...(lanes !== 'actual' ? planned : []), ...(lanes !== 'planned' ? actualAll : [])]
  // Another day has no "now"; aim at 9 AM, or its first block if earlier
  const focusMin = isToday ? nowMin : Math.min(9 * 60, ...shown.map((b) => b.startMin))
  const { startHour, endHour } = timelineRange(shown, isToday ? nowMin : 0)
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX

  // The resting position: "now" about a third from the top, so recent work sits above it
  const scrollToNow = (behavior: ScrollBehavior) => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: Math.max(0, top(focusMin) - el.clientHeight / 3), behavior })
  }
  // Start there once per day shown; after that the whole day scrolls freely
  useEffect(() => {
    scrolledRef.current = false
  }, [shownDate])
  useEffect(() => {
    if (scrolledRef.current || !scrollRef.current) return
    scrollToNow('auto')
    scrolledRef.current = true
  })

  const chooseLanes = (next: Lanes) => {
    setLanes(next)
    try {
      localStorage.setItem(LANES_KEY, next)
    } catch {}
  }

  // Lane geometry (percent of the area right of the ruler)
  const laneStyle = (kind: 'planned' | 'actual') =>
    lanes === 'both'
      ? kind === 'planned'
        ? { left: RULER_PX, width: `calc((100% - ${RULER_PX}px) / 2 - 4px)` }
        : { left: `calc(${RULER_PX}px + (100% - ${RULER_PX}px) / 2 + 4px)`, right: 0 }
      : { left: RULER_PX, right: 0 }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-4 pb-2 flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-today-muted">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDayOffset((o) => o - 1)}
            className="rounded p-0.5 hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span data-timeline-day className="min-w-[5.5rem] text-center tabular-nums" aria-live="polite">
            {isToday ? 'Today' : DAY_LABEL.format(new Date(ly, lm - 1, ld))}
          </span>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDayOffset((o) => o + 1)}
            className="rounded p-0.5 hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => (isToday ? scrollToNow('smooth') : setDayOffset(0))}
          aria-label={isToday ? 'Jump to now' : 'Back to today'}
          title={isToday ? 'Jump to now' : 'Back to today'}
          className="ml-auto rounded-full p-1.5 text-today-muted hover:bg-white/[0.06] hover:text-white"
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
        <div className="flex rounded-full bg-white/[0.06] p-0.5" role="radiogroup" aria-label="Timeline lanes">
          {(['both', 'planned', 'actual'] as const).map((key) => (
            <button
              key={key}
              role="radio"
              aria-checked={lanes === key}
              onClick={() => chooseLanes(key)}
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs capitalize transition-colors',
                lanes === key ? 'bg-today-foreground text-today' : 'text-today-muted hover:text-white',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {lanes === 'both' && (
        <div className="px-6 pb-1 flex text-[11px] text-today-muted" aria-hidden>
          <span style={{ marginLeft: RULER_PX }} className="flex-1">Planned</span>
          <span className="flex-1 pl-2">Actual</span>
        </div>
      )}
      <div ref={scrollRef} data-timeline-scroll className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-4">
        <div className="relative" style={{ height: (endHour - startHour) * HOUR_PX }}>
          {/* Hour ruler */}
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-dashed border-white/10" style={{ top: i * HOUR_PX }}>
              <span className="absolute -top-2 left-0 bg-today pr-1.5 text-[11px] leading-none text-today-muted">
                {hourLabel(startHour + i)}
              </span>
            </div>
          ))}

          {lanes !== 'actual' &&
            planned.map((b) => (
              <button
                key={b.id}
                onClick={onOpenTimetable}
                title="Open in Timetable"
                data-lane="planned"
                className="absolute flex flex-col justify-start rounded-md border border-dashed border-today-muted/70 px-2 py-1 text-left text-[12px] leading-tight text-today-foreground overflow-hidden hover:bg-white/[0.04]"
                style={{ ...laneStyle('planned'), top: top(b.startMin) + 1, height: Math.max(18, top(b.endMin) - top(b.startMin) - 2) }}
              >
                {b.label || 'Untitled'}
              </button>
            ))}

          {lanes !== 'planned' &&
            actualAll.map((b) => (
              <div
                key={b.id}
                data-lane="actual"
                className={cn(
                  'absolute rounded-md px-2 py-1 leading-tight overflow-hidden',
                  b.live ? 'bg-coral text-white' : 'bg-today-foreground text-today',
                )}
                // A pale block washed with the course color, so it stays light against the green
                style={{
                  ...laneStyle('actual'),
                  top: top(b.startMin) + 1,
                  height: Math.max(18, top(b.endMin) - top(b.startMin) - 2),
                  ...(!b.live && b.color
                    ? { backgroundColor: `color-mix(in srgb, ${b.color} 22%, hsl(var(--today-foreground)))` }
                    : {}),
                }}
              >
                <p className="truncate text-[12px] font-medium">{b.live ? `${b.label} · running` : b.label}</p>
                {top(b.endMin) - top(b.startMin) >= 36 && (
                  <p className={cn('truncate text-[11px] tabular-nums', b.live ? 'text-white/80' : 'text-today/70')}>
                    {clock(b.startMin)} to {clock(b.endMin)}
                  </p>
                )}
              </div>
            ))}

          {/* Now */}
          {/* Dot and line share one centre line, starting where the blocks start */}
          {isToday && (
            <div
              className="absolute right-0 flex -translate-y-1/2 items-center pointer-events-none"
              style={{ left: RULER_PX - 4, top: top(nowMin) }}
              aria-label="Now"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-coral" />
              <span className="h-0.5 flex-1 bg-coral" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
