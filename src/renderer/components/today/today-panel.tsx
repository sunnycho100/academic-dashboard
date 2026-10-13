import { useEffect, useReducer, useState } from 'react'
import type { Task, Category } from '@/lib/types'
import type { TodaySession } from '@/hooks/use-today-session'
import { Maximize2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/task-format'
import { PersonalDevTracker, runningPersonalDev } from '@/components/today/personal-dev-tracker'
import { FocusModeOverlay } from '@/components/today/focus-mode-overlay'
import { earned, emptyPanel, formatMoney, previewing, showSeconds } from '@/lib/prefs'
import { EmptyToday } from '@/components/today/empty-today'

interface TodayPanelProps {
  tasks: Task[]
  categories: Category[]
  session: TodaySession
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  children?: React.ReactNode
}

const DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** The dark green Today panel: focus timer on top, then the day timeline (children), then personal dev timers. */
export function TodayPanel({ tasks, categories, session, onToggleTask, children }: TodayPanelProps) {
  const [focusMode, setFocusMode] = useState(false)
  // Re-render when the seconds or hourly value settings change
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    window.addEventListener('prefs-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('prefs-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const seconds = showSeconds()
  const { timerStates, getElapsedSeconds, formatTime, startTimer, pauseTimer, resumeTimer, stopTimer, totalStudySeconds } = session

  const running = tasks.find((t) => timerStates[t.id]?.isRunning && !timerStates[t.id]?.isPaused)
  const paused = tasks.find((t) => timerStates[t.id]?.isRunning && timerStates[t.id]?.isPaused)
  const next = tasks.find((t) => t.status !== 'done')
  const active = running ?? paused ?? next
  // Settings > Display: what fills the top when nothing is planned. While Edit display is
  // trying a choice, show it even with tasks planned so the preview is visible.
  const empty = emptyPanel()
  const emptyView = empty !== 'now' && (!active || previewing('empty-panel')) ? empty : null
  const activeCategory = active && categories.find((c) => c.id === active.categoryId)
  const elapsed = active ? getElapsedSeconds(active.id) : 0

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
  const doneMinutes = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
  const progress = totalMinutes > 0 ? Math.round((doneMinutes / totalMinutes) * 100) : 0

  if (focusMode) {
    return (
      <FocusModeOverlay
        tasks={tasks}
        categories={categories}
        timerStates={timerStates}
        totalMinutes={totalMinutes}
        remainingMinutes={totalMinutes - doneMinutes}
        progress={progress}
        totalStudySeconds={totalStudySeconds}
        getElapsedSeconds={getElapsedSeconds}
        formatTime={formatTime}
        startTimer={startTimer}
        pauseTimer={pauseTimer}
        resumeTimer={resumeTimer}
        stopTimer={stopTimer}
        onToggleTask={onToggleTask}
        onClose={() => setFocusMode(false)}
      />
    )
  }

  const toggleActive = () => {
    if (!active) return
    if (running) pauseTimer(active.id)
    else if (paused) resumeTimer(active.id)
    else startTimer(active.id)
  }

  return (
    <aside aria-label="Today panel" className="h-full rounded-2xl bg-today text-today-foreground flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-5 flex-shrink-0">
        <div className="flex items-baseline">
          <h2 className="font-serif text-2xl text-white">Today</h2>
          <span className="ml-auto text-xs uppercase tracking-wider text-today-muted">{DATE.format(new Date())}</span>
          {tasks.length > 0 && (
            <button
              onClick={() => setFocusMode(true)}
              className="ml-3 self-center text-today-muted hover:text-white transition-colors"
              title="Focus mode"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {emptyView ? (
          <EmptyToday variant={emptyView} saved={totalStudySeconds} />
        ) : (
        <>
        {/* Focus timer */}
        <p className="mt-5 text-xs uppercase tracking-wider text-today-muted">
          {running ? 'Now working on' : paused ? 'Paused' : active ? 'Up next' : 'Nothing planned'}
        </p>
        <p className="mt-1 text-sm text-white truncate">
          {active ? (
            <>
              {active.title}
              {activeCategory && <span className="text-today-muted"> · {activeCategory.name}</span>}
            </>
          ) : (
            <span className="text-today-muted">Add tasks to Today to start a timer.</span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <span className="font-extralight text-[4.5rem] leading-none tracking-tight tabular-nums text-white" aria-label="Active timer">
            {formatClock(elapsed, seconds)}
          </span>
          {active && (
            <button
              onClick={toggleActive}
              className={cn(
                'ml-auto h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-95',
                running ? 'bg-coral text-white' : 'bg-today-foreground text-today',
              )}
              title={running ? 'Pause timer' : paused ? 'Resume timer' : 'Start timer'}
            >
              {running ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>
          )}
        </div>
        {/* One dot per task in today's plan: done, current (pill), still to do */}
        {tasks.length > 0 && (
          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {tasks.map((t) => (
              <span
                key={t.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  t.id === active?.id ? 'w-7 bg-white' : t.status === 'done' ? 'w-1.5 bg-today-muted' : 'w-1.5 bg-white/20',
                )}
              />
            ))}
          </div>
        )}
        <TodayTotal saved={totalStudySeconds} seconds={seconds} />
        </>
        )}
      </div>

      <div className="flex-1 min-h-0 border-t border-white/10">{children}</div>

      <div className="flex-shrink-0 border-t border-white/10">
        <PersonalDevTracker />
      </div>
    </aside>
  )
}

/**
 * Today's total and what it's worth. Ticks on its own each second, so the earned amount
 * climbs while any timer runs without re-rendering the whole panel. A running Personal dev
 * timer is only saved when it stops, so its live stretch is added here (as the widget does).
 */
function TodayTotal({ saved, seconds }: { saved: number; seconds: boolean }) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  const devLive = runningPersonalDev().reduce(
    (sum, d) => sum + Math.max(0, Math.floor((Date.now() - new Date(d.segmentStartedAt).getTime()) / 1000)),
    0,
  )
  const total = saved + devLive
  return (
    <p className="mt-3 text-xs uppercase tracking-wider text-today-muted tabular-nums">
      Today total {formatClock(total, seconds)}
      <span className="ml-3 text-white" aria-label="Earned today">{formatMoney(earned(total), seconds)}</span>
    </p>
  )
}
