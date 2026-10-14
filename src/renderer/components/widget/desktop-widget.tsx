import { useEffect, useState } from 'react'
import { useLiveWork, type LiveWork } from '@/hooks/use-live-work'
import { formatClock } from '@/lib/task-format'
import { formatMoney, hero as savedHero, setPref, type Hero } from '@/lib/prefs'
import { cn } from '@/lib/utils'

const split = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 }
}
const pad = (n: number) => String(n).padStart(2, '0')

const CLOCK = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
/** "since 11:20 PM", or Paused / Nothing running */
const status = (w: LiveWork) =>
  w.state === 'running' && w.since ? `since ${CLOCK.format(new Date(w.since))}` : w.state === 'paused' ? 'Paused' : 'Nothing running'

/** Hero value: the running activity's time, or today's total when nothing runs. */
const heroSeconds = (w: LiveWork) => (w.state === 'idle' ? w.todayTotal : w.elapsed)

// Approximate advance widths (in em) of SF Pro's tabular digits and punctuation, so the hero
// can be sized to fill the card's width. It only changes size when the text gains a character
// (9:59 to 10:00, $99 to $100), never on an ordinary tick.
const EM: Record<string, number> = { ':': 0.3, '.': 0.27, ',': 0.27, $: 0.6 }
const CONTENT_WIDTH = 290 // card 338 minus 24 + 24 padding
function fitSize(text: string, max: number): number {
  const em = [...text].reduce((sum, ch) => sum + (EM[ch] ?? 0.6), 0) * 0.96 // tracking -0.04em
  return Math.min(max, Math.floor(CONTENT_WIDTH / em))
}

// Swiss railway clock (Hilfiker) and Braun: one neutral grotesque number set as large as the
// square allows, minutes only, and a single yellow accent that sweeps a ruler once a minute so
// the widget looks alive without ticking digits. The switch at the top right swaps the big
// number between this session's time and what today has earned.

/** The timer shown on the desktop, in its own small frameless window. */
export function DesktopWidget() {
  const work = useLiveWork()
  // Shared with the Today panel: choosing Earned in either shows it in both
  const [hero, setHero] = useState<Hero>(savedHero)
  useEffect(() => {
    const sync = () => setHero(savedHero())
    window.addEventListener('storage', sync)
    window.addEventListener('prefs-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('prefs-changed', sync)
    }
  }, [])
  const choose = (h: Hero) => setPref('widget-hero', h)

  const { h, m, s } = split(heroSeconds(work))
  const time = `${h}:${pad(m)}`
  const money = formatMoney(work.earnedToday)
  const big = hero === 'time' ? time : money
  // The sweep fills in 58.5 s and rests at the end, like the railway clock's red hand
  const p = work.state === 'running' ? Math.min(1, s / 58.5) : 0
  const muted = 'text-[#8a8780] dark:text-[#8d8a84]'

  return (
    <div className="h-screen w-screen p-[6px] select-none">
      <div className="app-drag h-full w-full rounded-[30px] bg-[#f3f1ec] text-[#151514] dark:bg-[#121211] dark:text-[#efede8] flex flex-col px-[24px] pt-[22px] pb-[20px] ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-[12px]">
          <div className="min-w-0">
            <p className="text-[15px] leading-[20px] font-medium truncate">{work.state === 'idle' ? 'Today' : work.title}</p>
            <p className={cn('text-[13px] leading-[18px]', muted)}>{status(work)}</p>
          </div>
          <div className="ml-auto flex gap-[10px] text-[13px] leading-[20px]" role="group" aria-label="Big number shows">
            {(['time', 'money'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => choose(k)}
                aria-pressed={hero === k}
                className={cn(
                  'border-b-[1.5px] pb-[1px] transition-colors',
                  hero === k ? 'border-current' : cn('border-transparent hover:text-[#151514] dark:hover:text-[#efede8]', muted),
                )}
              >
                {k === 'time' ? 'Time' : 'Earned'}
              </button>
            ))}
          </div>
        </div>

        <p
          className={cn('mt-auto leading-[0.8] font-medium tracking-[-0.04em] tabular-nums whitespace-nowrap', work.state !== 'running' && hero === 'time' && muted)}
          style={{ fontSize: fitSize(big, 150) }}
          aria-label={hero === 'time' ? 'Timer' : 'Earned today'}
        >
          {big}
        </p>

        <div className="relative mt-[16px] h-[9px] w-full" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/[0.07] dark:bg-white/[0.08]" />
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} className="absolute bottom-0 w-px bg-black/20 dark:bg-white/20" style={{ left: `${(i / 12) * 100}%`, height: i % 3 === 0 ? 9 : 6 }} />
          ))}
          <div
            className={cn('absolute left-0 bottom-0 h-[3px] bg-[#e8b21e]', p > 0 && 'transition-[width] duration-1000 ease-linear')}
            style={{ width: `${p * 100}%` }}
          />
        </div>

        <div className="mt-[14px] grid grid-cols-2 gap-[12px] text-[13px] leading-[18px]">
          <div>
            <p className={muted}>Today</p>
            <p className="text-[22px] leading-[28px] font-medium tabular-nums">{formatClock(work.todayTotal, false)}</p>
          </div>
          {/* The other of the two big values: earned under the time, this session under the money */}
          {(hero === 'time' || work.state !== 'idle') && (
            <div>
              <p className={muted}>{hero === 'time' ? 'Earned' : 'This session'}</p>
              <p className="text-[22px] leading-[28px] font-medium tabular-nums">{hero === 'time' ? money : time}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
