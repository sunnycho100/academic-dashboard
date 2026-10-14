import { useEffect, useReducer, useState } from 'react'
import { formatClock } from '@/lib/task-format'
import { earned, formatMoney, showEarnings, showSeconds } from '@/lib/prefs'
import { dayRecordsUrl } from '@/hooks/use-today-session'
import { runningPersonalDev } from '@/components/today/personal-dev-tracker'
import { cn } from '@/lib/utils'

/** Today's tracked seconds, including a running Personal dev timer; re-renders each second. */
function useTodaySeconds(saved: number) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return saved + runningPersonalDev().reduce((s, d) => s + Math.max(0, Math.floor((Date.now() - new Date(d.segmentStartedAt).getTime()) / 1000)), 0)
}

/**
 * What fills the top of the Today panel when nothing is planned, chosen in Settings > Display:
 * today's tracked time and earnings, or the last seven days as bars.
 */
export function EmptyToday({ variant, saved }: { variant: 'today' | 'week'; saved: number }) {
  return variant === 'today' ? <DaySoFar saved={saved} /> : <ThisWeek saved={saved} />
}

// ── Today so far: the space shows what today has already added up to ──

function DaySoFar({ saved }: { saved: number }) {
  const total = useTodaySeconds(saved)
  const time = formatClock(total, false)
  const money = formatMoney(earned(total), false)
  // Two numbers side by side: step down once either gets long ($10,000 or 100:00)
  const size = Math.max(time.length, money.length) > 6 ? 'text-[2.6rem]' : 'text-[3.6rem]'
  return (
    <div className="mt-5">
      <p className="text-xs uppercase tracking-wider text-today-muted">Nothing planned · today so far</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className={cn('font-extralight leading-none tracking-tight tabular-nums text-white whitespace-nowrap', size)}>{time}</p>
          <p className="mt-1.5 text-xs text-today-muted">tracked</p>
        </div>
        {showEarnings() && (
          <div>
            <p className={cn('font-extralight leading-none tracking-tight tabular-nums text-white whitespace-nowrap', size)}>{money}</p>
            <p className="mt-1.5 text-xs text-today-muted">earned</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Last 7 days: a bar per day of tracked time, with the week's total and earnings ──

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' })

function ThisWeek({ saved }: { saved: number }) {
  const today = useTodaySeconds(saved)
  const [past, setPast] = useState<number[]>([0, 0, 0, 0, 0, 0]) // six days before today, oldest first
  useEffect(() => {
    const load = () =>
      Promise.all(
        [-6, -5, -4, -3, -2, -1].map((o) =>
          fetch(dayRecordsUrl(o))
            .then((r) => r.json())
            .then((recs: { duration: number }[]) => (Array.isArray(recs) ? recs.reduce((s, r) => s + r.duration, 0) : 0))
            .catch(() => 0),
        ),
      ).then(setPast)
    load()
    window.addEventListener('time-records-changed', load)
    return () => window.removeEventListener('time-records-changed', load)
  }, [])
  const days = [...past, today]
  const max = Math.max(3600, ...days)
  const week = days.reduce((s, d) => s + d, 0)
  const labels = [-6, -5, -4, -3, -2, -1, 0].map((o) => {
    const d = new Date()
    d.setDate(d.getDate() + o)
    return WEEKDAY.format(d)
  })
  return (
    <div className="mt-5">
      <p className="text-xs uppercase tracking-wider text-today-muted">Nothing planned · last 7 days</p>
      <div className="mt-3 flex items-end gap-2" role="img" aria-label={`Tracked ${formatClock(week, false)} in the last 7 days`}>
        {days.map((s, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[76px] w-full items-end">
              <div
                className={cn('w-full rounded-[3px]', i === 6 ? 'bg-today-foreground' : 'bg-white/20')}
                style={{ height: `${Math.max(2, (s / max) * 76)}px` }}
                title={formatClock(s, false)}
              />
            </div>
            <span className={cn('text-[11px] leading-none', i === 6 ? 'text-white' : 'text-today-muted')}>{labels[i]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-today-muted tabular-nums">
        Week {formatClock(week, false)}
        {showEarnings() && <span className="ml-3 text-white">{formatMoney(earned(week), showSeconds())}</span>}
        <span className="ml-3">Today {formatClock(today, false)}</span>
      </p>
    </div>
  )
}
