import { useEffect, useRef, useState } from 'react'
import type { Task, Category } from '@/lib/types'
import type { TodaySession } from '@/hooks/use-today-session'
import { logicalToday } from '@/hooks/use-today-session'
import { cn } from '@/lib/utils'
import { plannedBlocks, actualBlocks, timelineRange, type TimelineBlock } from '@/lib/timeline'

type Lanes = 'both' | 'planned' | 'actual'
const LANES_KEY = 'timeline-lanes'
const HOUR_PX = 64
const RULER_PX = 44

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolledRef = useRef(false)

  // Fetch both lanes; poll so edits in other tabs and finished segments show up
  useEffect(() => {
    const load = () => {
      const { date, startHour, endHour } = logicalToday()
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
  }, [tasks])

  // Minutes are measured from midnight of the logical day, so a day that runs past
  // midnight (Time Records day boundaries) keeps counting up past 24:00.
  const [ly, lm, ld] = logicalToday(now).date.split('-').map(Number)
  const midnight = new Date(ly, lm - 1, ld).getTime()
  // The running segment is drawn live from the timer state
  const nowMin = Math.round((now.getTime() - midnight) / 60_000)
  const live: TimelineBlock[] = tasks.flatMap((task) => {
    const state = session.timerStates[task.id]
    if (!state?.isRunning || state.isPaused || !state.segmentStartedAt) return []
    const startMin = Math.round((new Date(state.segmentStartedAt).getTime() - midnight) / 60_000)
    const color = categories.find((c) => c.id === task.categoryId)?.color
    return [{ id: `live-${task.id}`, label: task.title, startMin, endMin: Math.max(nowMin, startMin + 1), color, live: true }]
  })
  const actualAll = [...actual, ...live]

  const shown = [...(lanes !== 'actual' ? planned : []), ...(lanes !== 'planned' ? actualAll : [])]
  const { startHour, endHour } = timelineRange(shown, nowMin)
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX

  // Bring "now" into view once, about a third from the top
  useEffect(() => {
    const el = scrollRef.current
    if (!el || scrolledRef.current) return
    el.scrollTop = Math.max(0, top(nowMin) - el.clientHeight / 3)
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
        <span className="text-xs uppercase tracking-wider text-today-muted">Timeline</span>
        <div className="ml-auto flex rounded-full bg-white/[0.06] p-0.5" role="radiogroup" aria-label="Timeline lanes">
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
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-4">
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
                  'absolute rounded-md px-2 py-1 leading-tight overflow-hidden text-white',
                  b.live && 'bg-coral',
                )}
                // Calendar-style block: the course color as a tint with a hairline of itself, no dot
                style={{
                  ...laneStyle('actual'),
                  top: top(b.startMin) + 1,
                  height: Math.max(18, top(b.endMin) - top(b.startMin) - 2),
                  ...(!b.live && b.color
                    ? {
                        backgroundColor: `color-mix(in srgb, ${b.color} 45%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${b.color} 70%, transparent)`,
                      }
                    : !b.live
                      ? { backgroundColor: 'rgba(255,255,255,0.14)' }
                      : {}),
                }}
              >
                <p className="truncate text-[12px] font-medium">{b.live ? `${b.label} · running` : b.label}</p>
                {top(b.endMin) - top(b.startMin) >= 36 && (
                  <p className="truncate text-[11px] text-white/70 tabular-nums">
                    {clock(b.startMin)} to {clock(b.endMin)}
                  </p>
                )}
              </div>
            ))}

          {/* Now */}
          {/* Dot and line share one centre line, starting where the blocks start */}
          <div
            className="absolute right-0 flex -translate-y-1/2 items-center pointer-events-none"
            style={{ left: RULER_PX - 4, top: top(nowMin) }}
            aria-label="Now"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-coral" />
            <span className="h-0.5 flex-1 bg-coral" />
          </div>
        </div>
      </div>
    </div>
  )
}
