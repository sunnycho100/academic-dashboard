import { useEffect } from 'react'
import { Task, Category } from '@/lib/types'
import { Minimize2, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { TimerState } from '@/hooks/use-task-timer'
import { CourseRing } from '@/components/tasks/course-ring'
import { currentDayStart, dueLabel, formatClock, formatMinutes, pausedSince } from '@/lib/task-format'
import { rolloverHour } from '@/hooks/use-today-session'
import { earned, formatMoney, showSeconds } from '@/lib/prefs'

export interface FocusModeOverlayProps {
  tasks: Task[]
  categories: Category[]
  timerStates: Record<string, TimerState>
  totalMinutes: number
  remainingMinutes: number
  progress: number
  totalStudySeconds: number
  getElapsedSeconds: (taskId: string) => number
  formatTime: (seconds: number) => string
  startTimer: (taskId: string) => void
  pauseTimer: (taskId: string) => void
  resumeTimer: (taskId: string) => void
  stopTimer: (taskId: string) => void
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onClose: () => void
}

const DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * Focus mode: the Today panel opened to the whole window. One task large in the middle with
 * its timer, today's plan underneath as quiet rows, and what today adds up to. Escape closes.
 */
export function FocusModeOverlay({
  tasks,
  categories,
  timerStates,
  totalMinutes,
  remainingMinutes,
  totalStudySeconds,
  getElapsedSeconds,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  onToggleTask,
  onClose,
}: FocusModeOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const seconds = showSeconds()
  const isRunning = (t: Task) => !!timerStates[t.id]?.isRunning && !timerStates[t.id]?.isPaused
  const isPaused = (t: Task) => !!timerStates[t.id]?.isRunning && !!timerStates[t.id]?.isPaused
  const running = tasks.find(isRunning)
  // Paused today only; a task paused on an earlier day waits its turn like the rest
  const paused = tasks.find((t) => pausedSince(timerStates[t.id], currentDayStart(new Date(), rolloverHour())))
  const active = running ?? paused ?? tasks.find((t) => t.status !== 'done')
  const activeCategory = active && categories.find((c) => c.id === active.categoryId)

  // Starting another task pauses the one running, so only one timer counts at a time
  const toggle = (t: Task) => {
    if (isRunning(t)) return pauseTimer(t.id)
    if (running) pauseTimer(running.id)
    if (isPaused(t)) resumeTimer(t.id)
    else startTimer(t.id)
  }
  const complete = (t: Task) => {
    const elapsed = getElapsedSeconds(t.id)
    if (timerStates[t.id]?.isRunning) stopTimer(t.id)
    onToggleTask(t.id, elapsed)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-label="Focus mode"
      className="fixed inset-0 z-50 flex flex-col bg-today text-today-foreground"
    >
      {/* The traffic lights sit in this row, so it doubles as the window's drag area */}
      <div className="app-drag flex h-[52px] flex-shrink-0 items-center justify-end gap-4 px-7">
        <span className="text-xs uppercase tracking-wider text-today-muted">{DATE.format(new Date())}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-today-muted transition-colors hover:text-white"
          title="Leave focus mode (Esc)"
          aria-label="Leave focus mode"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[min(64rem,85vw)] flex-1 min-h-0 flex-col justify-center px-10 pb-16">
        {/* The one task */}
        <div>
          <p className="text-xs uppercase tracking-wider text-today-muted">
            {running ? 'Now working on' : paused ? 'Paused' : active ? 'Up next' : 'Nothing planned'}
          </p>
          <h2 className="mt-2 font-serif text-[clamp(2.2rem,3.6vw,3.4rem)] leading-tight text-white text-balance">
            {active ? active.title : 'Add tasks to Today to focus on them here.'}
          </h2>
          {activeCategory && <p className="mt-1 text-sm text-today-muted">{activeCategory.name} · {active?.type}</p>}

          <div className="mt-6 flex items-center gap-8">
            <span className="font-extralight text-[clamp(8rem,15vw,14rem)] leading-[0.9] tracking-tight tabular-nums text-white" aria-label="Active timer">
              {formatClock(active ? getElapsedSeconds(active.id) : 0, seconds)}
            </span>
            {active && (
              <button
                type="button"
                onClick={() => toggle(active)}
                className={cn(
                  'ml-auto flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
                  running ? 'bg-coral text-white' : 'bg-today-foreground text-today',
                )}
                title={running ? 'Pause timer' : paused ? 'Resume timer' : 'Start timer'}
              >
                {running ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
              </button>
            )}
          </div>

          <p className="mt-5 text-xs uppercase tracking-wider text-today-muted tabular-nums">
            Today total {formatClock(totalStudySeconds, seconds)}
            <span className="ml-3 text-white">{formatMoney(earned(totalStudySeconds), seconds)}</span>
            {totalMinutes > 0 && (
              <span className="ml-6">{remainingMinutes > 0 ? `${formatMinutes(remainingMinutes)} of ${formatMinutes(totalMinutes)} planned left` : 'Plan done'}</span>
            )}
          </p>
        </div>

        {/* Today's plan */}
        {tasks.length > 0 && (
          <div className="mt-10 max-h-[32vh] min-h-0 overflow-y-auto border-t border-white/10">
            <ul className="divide-y divide-white/10">
              {tasks.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId)
                const due = dueLabel(t.dueAt)
                const started = !!timerStates[t.id]?.isRunning
                return (
                  <li key={t.id} className={cn('flex items-center gap-4 py-3', t.status === 'done' && 'opacity-50')}>
                    <CourseRing color={cat?.color ?? '#888'} checked={t.status === 'done'} onToggle={() => complete(t)} label={`Complete ${t.title}`} />
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      className={cn('min-w-0 flex-1 truncate text-left text-sm', t.id === active?.id ? 'text-white' : 'text-today-foreground/80 hover:text-white', t.status === 'done' && 'line-through')}
                      title={isRunning(t) ? 'Pause timer' : 'Work on this now'}
                    >
                      {t.title}
                    </button>
                    <span className="w-20 flex-shrink-0 truncate text-xs text-today-muted">{cat?.name}</span>
                    <span className={cn('w-16 flex-shrink-0 text-right text-xs tabular-nums', isRunning(t) ? 'text-coral' : 'text-today-muted')}>
                      {started ? formatClock(getElapsedSeconds(t.id), false) : t.estimatedDuration ? formatMinutes(t.estimatedDuration) : ''}
                    </span>
                    <span className={cn('w-16 flex-shrink-0 text-right text-xs tabular-nums', due?.late ? 'text-coral' : 'text-today-muted')}>
                      {due?.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}
