'use client'

import { Task, Category } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Clock, Target, Minimize2, Play, Pause, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { TimerState } from '@/hooks/use-task-timer'

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}m`
}

function getDueInfo(dueAt: string | null) {
  if (!dueAt) return null
  const dueDate = new Date(dueAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDateOnly = new Date(dueDate)
  dueDateOnly.setHours(0, 0, 0, 0)
  const daysDiff = Math.floor((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return { label: `${Math.abs(daysDiff)}d overdue`, variant: 'destructive' as const }
  if (daysDiff === 0) return { label: 'Due today', variant: 'default' as const, className: 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/40 font-medium' }
  if (daysDiff === 1) return { label: 'Tomorrow', variant: 'default' as const }
  return { label: `${daysDiff}d`, variant: 'secondary' as const }
}

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

export function FocusModeOverlay({
  tasks,
  categories,
  timerStates,
  totalMinutes,
  remainingMinutes,
  progress,
  totalStudySeconds,
  getElapsedSeconds,
  formatTime,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  onToggleTask,
  onClose,
}: FocusModeOverlayProps) {
  const getCat = (id: string) => categories.find((c) => c.id === id)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Blur backdrop */}
      <motion.div
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: 'blur(20px)' }}
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
      />

      {/* Expanded card */}
      <motion.div
        layoutId="today-panel-card"
        className="relative z-10 w-full max-w-lg max-h-[80vh] rounded-3xl glass-thick shadow-2xl flex flex-col overflow-hidden"
        transition={{ type: 'spring', stiffness: 250, damping: 28 }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base tracking-tight">Focus Mode</h2>
                <p className="text-xs text-muted-foreground/50">One task at a time</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-8 w-8"
              onClick={onClose}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {totalMinutes > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="tabular-nums font-medium">
                  {formatDuration(totalMinutes)} planned
                </span>
                <span className="text-muted-foreground/60 tabular-nums text-xs">
                  {remainingMinutes > 0 ? `${formatDuration(remainingMinutes)} remaining` : 'All done!'}
                </span>
              </div>
              <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-2">
            {tasks.map((task) => {
              const cat = getCat(task.categoryId)
              const due = getDueInfo(task.dueAt)
              const timerState = timerStates[task.id]
              const isRunning = timerState?.isRunning && !timerState?.isPaused
              const isPaused = timerState?.isPaused
              const elapsedSeconds = getElapsedSeconds(task.id)
              const hasStarted = timerState?.isRunning
              
              return (
                <motion.div
                  key={task.id}
                  layout
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'group flex items-center gap-3 p-4 rounded-2xl transition-all duration-200',
                    'glass-thin glass-interactive',
                    'border border-white/10 hover:border-white/20',
                    task.status === 'done' && 'opacity-40',
                    isRunning && 'ring-2 ring-primary/20'
                  )}
                >
                  {/* Play/Pause Button */}
                  <AnimatePresence mode="wait">
                    {!hasStarted ? (
                      <motion.button
                        key="play"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => startTimer(task.id)}
                        className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        title="Start timer"
                      >
                        <Play className="h-5 w-5 fill-current" />
                      </motion.button>
                    ) : isPaused ? (
                      <motion.button
                        key="resume"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => resumeTimer(task.id)}
                        className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        title="Resume timer"
                      >
                        <Play className="h-5 w-5 fill-current" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="pause"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => pauseTimer(task.id)}
                        className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                        title="Pause timer"
                      >
                        <Pause className="h-5 w-5 fill-current" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'text-sm font-medium leading-snug',
                        task.status === 'done' && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </p>
                      {/* Timer Display */}
                      <AnimatePresence>
                        {hasStarted && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={cn(
                              'text-xs font-mono font-semibold tabular-nums px-2 py-0.5 rounded-md',
                              isRunning
                                ? 'bg-primary/10 text-primary animate-pulse'
                                : 'bg-muted/60 text-muted-foreground'
                            )}
                          >
                            {formatTime(elapsedSeconds)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {cat && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: cat.color }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      )}
                      <span className="text-muted-foreground/40 text-xs">&middot;</span>
                      <span className="text-xs text-muted-foreground/70">{task.type}</span>
                      {task.estimatedDuration && task.estimatedDuration > 0 && (
                        <>
                          <span className="text-muted-foreground/40 text-xs">&middot;</span>
                          <span className="text-xs text-muted-foreground/40 tabular-nums">
                            {formatDuration(task.estimatedDuration)}
                          </span>
                        </>
                      )}
                      {due && (
                        <>
                          <span className="text-muted-foreground/40 text-xs">&middot;</span>
                          <Badge variant={due.variant} className={cn('text-xs font-normal', 'className' in due ? due.className : '')}>
                            {due.label}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Complete Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      const elapsedSeconds = getElapsedSeconds(task.id)
                      if (hasStarted) {
                        stopTimer(task.id)
                      }
                      onToggleTask(task.id, elapsedSeconds)
                    }}
                    className={cn(
                      'flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all',
                      task.status === 'done'
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'opacity-0 group-hover:opacity-100 bg-muted/60 hover:bg-green-500/20 text-muted-foreground hover:text-green-600'
                    )}
                    title={task.status === 'done' ? 'Completed' : 'Mark as complete'}
                  >
                    <Check className="h-5 w-5" />
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
        
        {/* Study Time Footer in Focus Mode */}
        <div className="border-t border-white/10 px-6 py-4 glass-thick">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Study Time</p>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {formatTime(totalStudySeconds)}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground/60">
              {Object.values(timerStates).filter(s => s.isRunning && !s.isPaused).length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
