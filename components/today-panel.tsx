'use client'

import { useState, useEffect, useRef } from 'react'
import { Task, Category } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Clock, Target, Sparkles, Maximize2, Minimize2, ChevronLeft, Play, Pause, Check, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskTimers } from '@/hooks/use-task-timer'
import { PersonalDevTracker } from '@/components/personal-dev-tracker'

interface TodayPanelProps {
  tasks: Task[]
  allTasks: Task[]
  categories: Category[]
  onRemoveFromToday: (taskId: string) => void
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onReorderToday: (reorderedIds: string[]) => void
  isDragging?: boolean
}

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
  if (daysDiff === 0) return { label: 'Due today', variant: 'destructive' as const }
  if (daysDiff === 1) return { label: 'Tomorrow', variant: 'default' as const }
  return { label: `${daysDiff}d`, variant: 'secondary' as const }
}

/* Animated rolling counter for total time */
function RollingCounter({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 14, opacity: 0, scale: 0.7, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ y: -14, opacity: 0, scale: 0.7, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="inline-block tabular-nums font-semibold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <span className="text-muted-foreground/60 font-normal">{label}</span>
    </span>
  )
}

/* Sortable wrapper for individual today task items */
function SortableTodayItem({
  id,
  children,
}: {
  id: string
  children: (
    listeners: ReturnType<typeof useSortable>['listeners'],
    attributes: ReturnType<typeof useSortable>['attributes']
  ) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children(listeners, attributes)}
    </div>
  )
}

export function TodayPanel({
  tasks,
  allTasks,
  categories,
  onRemoveFromToday,
  onToggleTask,
  onReorderToday,
  isDragging = false,
}: TodayPanelProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'today-drop-zone' })
  const [focusMode, setFocusMode] = useState(false)
  const [dbStudySeconds, setDbStudySeconds] = useState(0)
  const studyPollRef = useRef<NodeJS.Timeout | null>(null)

  // dnd-kit sensors for internal reordering (separate from main list DnD)
  const todaySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleTodayDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.id === String(active.id))
    const newIndex = tasks.findIndex((t) => t.id === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = tasks.map((t) => t.id)
    const [moved] = newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, moved)
    onReorderToday(newOrder)
  }
  
  const {
    timerStates,
    getElapsedSeconds,
    formatTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTotalStudyTime,
    registerTaskMeta,
  } = useTaskTimers(tasks.map(t => t.id))

  // Register task metadata so time records include category info
  useEffect(() => {
    tasks.forEach((task) => {
      const cat = categories.find((c) => c.id === task.categoryId)
      registerTaskMeta({
        taskId: task.id,
        taskTitle: task.title,
        categoryName: cat?.name ?? 'Unknown',
        categoryColor: cat?.color ?? '#888',
        taskType: task.type,
      })
    })
  }, [tasks, categories, registerTaskMeta])

  // Fetch today's total study time from ALL time records (using day boundaries)
  useEffect(() => {
    const fetchStudyTime = () => {
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const tzOffset = now.getTimezoneOffset()
      // Read day boundaries from localStorage (same key as Time Records dialog)
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
      const endHourParam = endHour > 24 ? endHour - 24 : 0
      fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${startHour}&endHour=${endHourParam}`)
        .then((res) => res.json())
        .then((records: Array<{ duration: number }>) => {
          if (!Array.isArray(records)) return
          const totalSec = records.reduce((sum, r) => sum + r.duration, 0)
          setDbStudySeconds(totalSec)
        })
        .catch(() => {})
    }

    fetchStudyTime()
    // Poll every 30 seconds to keep study time fresh
    studyPollRef.current = setInterval(fetchStudyTime, 30000)
    return () => {
      if (studyPollRef.current) clearInterval(studyPollRef.current)
    }
  }, [tasks]) // re-fetch when tasks change (e.g. after completing one)

  // Total study time = DB time records for today + any currently running live timers
  const totalStudySeconds = dbStudySeconds + getTotalStudyTime()

  const totalMinutes = tasks.reduce(
    (acc, t) => acc + (t.estimatedDuration || 0),
    0
  )
  const completedMinutes = tasks
    .filter((t) => t.status === 'done')
    .reduce((acc, t) => acc + (t.estimatedDuration || 0), 0)
  const remainingMinutes = totalMinutes - completedMinutes
  const completedCount = tasks.filter((t) => t.status === 'done').length
  const progress = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0

  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60

  const getCat = (id: string) => categories.find((c) => c.id === id)

  // Magnetic glow when any drag is active
  const showMagnetic = isOver || isDragging

  // ── Focus Mode (full-screen overlay) ──
  if (focusMode) {
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
          onClick={() => setFocusMode(false)}
        />

        {/* Expanded card */}
        <motion.div
          layoutId="today-panel-card"
          className="relative z-10 w-full max-w-lg max-h-[80vh] rounded-3xl border border-white/15 bg-card/90 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden"
          transition={{ type: 'spring', stiffness: 250, damping: 28 }}
        >
          <div className="px-6 pt-6 pb-4 border-b border-border/20">
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
                onClick={() => setFocusMode(false)}
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
                      'bg-background/60 hover:bg-background/90 backdrop-blur-sm',
                      'border border-border/20 hover:border-border/40',
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
                            <Badge variant={due.variant} className="text-xs font-normal">
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
          <div className="border-t border-border/20 px-6 py-4 bg-background/30 backdrop-blur-sm">
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

  // ── Normal (inline Bento card) ──
  return (
    <motion.div
      layout
      layoutId="today-panel-card"
      ref={setNodeRef}
      className={cn(
        'relative rounded-2xl flex flex-col overflow-hidden h-full',
        // Glassmorphism
        'bg-card/50 backdrop-blur-xl',
        'border',
        // Magnetic glow states
        isOver
          ? 'border-primary/40 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)] scale-[1.01]'
          : showMagnetic
            ? 'border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.1)]'
            : 'border-border/40 shadow-sm',
      )}
      animate={isOver ? { scale: 1.01 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ minHeight: 0 }}
    >
      {/* Radial inner glow on drag-over */}
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Dashed drop zone indicator when dragging */}
      <AnimatePresence>
        {showMagnetic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOver ? 0.8 : 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-1.5 rounded-xl border-2 border-dashed border-primary/30 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target className="h-3.5 w-3.5 text-primary" />
            </motion.div>
            <h2 className="font-semibold text-sm tracking-tight">Today&apos;s Plan</h2>
          </div>
          <div className="flex items-center gap-1">
            {tasks.length > 0 && (
              <motion.span
                key={completedCount}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-[10px] font-medium text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full tabular-nums mr-1"
              >
                {completedCount}/{tasks.length}
              </motion.span>
            )}
            {tasks.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-6 w-6 text-muted-foreground/40 hover:text-foreground"
                onClick={() => setFocusMode(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Time with rolling counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              {totalMinutes > 0 ? (
                <span className="tabular-nums">
                  {totalHours > 0 && <RollingCounter value={totalHours} label="h" />}
                  {totalHours > 0 && totalMins > 0 && ' '}
                  {(totalMins > 0 || totalHours === 0) && <RollingCounter value={totalMins} label="m" />}
                </span>
              ) : (
                <span className="text-muted-foreground/35">0m</span>
              )}
            </div>
            {totalMinutes > 0 && remainingMinutes > 0 && (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                {formatDuration(remainingMinutes)} left
              </span>
            )}
            {totalMinutes > 0 && remainingMinutes <= 0 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-[10px] text-green-500/70 font-medium"
              >
                All done!
              </motion.span>
            )}
          </div>

          {totalMinutes > 0 && (
            <div className="h-1 bg-secondary/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 border-t border-border/10" />

      {/* Task list / Drop zone */}
      <div className="relative z-10 px-3 py-2">
        {tasks.length === 0 ? (
          /* ── Empty State ── */
          <motion.div
            className={cn(
              'flex flex-col items-center justify-center py-10 rounded-2xl transition-all duration-500 mx-0.5',
              isOver ? 'bg-primary/[0.04]' : 'bg-transparent'
            )}
            animate={isOver ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Floating sparkle icon */}
            <motion.div
              className={cn(
                'relative mb-3 h-12 w-12 rounded-2xl flex items-center justify-center transition-colors duration-500',
                isOver ? 'bg-primary/10' : 'bg-secondary/30'
              )}
              animate={
                isOver
                  ? { rotate: [0, -5, 5, 0], scale: 1.08 }
                  : { rotate: 0, scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: isOver ? 0.8 : 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className={cn(
                  'h-5 w-5 transition-colors duration-500',
                  isOver ? 'text-primary' : 'text-muted-foreground/20'
                )} />
              </motion.div>

              {/* Shimmer sweep */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
              </div>
            </motion.div>

            <p className={cn(
              'text-[11px] font-medium transition-colors duration-500',
              isOver ? 'text-primary/80' : 'text-muted-foreground/30'
            )}>
              {isOver ? 'Release to add' : 'Plan your day'}
            </p>
            <p className="text-[9px] text-muted-foreground/20 mt-0.5">
              Drag tasks here
            </p>

            {/* Ghost placeholder when dragging over */}
            <AnimatePresence>
              {isOver && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 36, marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="w-full rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02]"
                />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ── Task list with sortable reordering ── */
          <DndContext
            sensors={todaySensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTodayDragEnd}
          >
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {/* Ghost placeholder at top when dragging over populated list */}
                <AnimatePresence>
                  {isOver && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 32 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.03] flex items-center justify-center"
                    >
                      <span className="text-[9px] text-primary/40 font-medium">Drop here</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {tasks.map((task, index) => {
                  const cat = getCat(task.categoryId)
                  const due = getDueInfo(task.dueAt)
                  const timerState = timerStates[task.id]
                  const isRunning = timerState?.isRunning && !timerState?.isPaused
                  const isPaused = timerState?.isPaused
                  const elapsedSeconds = getElapsedSeconds(task.id)
                  const hasStarted = timerState?.isRunning
                  
                  return (
                    <SortableTodayItem key={task.id} id={task.id}>
                      {(dragHandleListeners, dragHandleAttributes) => (
                        <motion.div
                          layout
                          layoutId={`today-task-${task.id}`}
                          initial={{ opacity: 0, x: 40, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -40, scale: 0.95, filter: 'blur(4px)' }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 28,
                            delay: index * 0.02,
                          }}
                          className={cn(
                            'group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                            'bg-background/60 hover:bg-background/90 backdrop-blur-sm',
                            'border border-border/30 hover:border-border/50',
                            'hover:shadow-md',
                            task.status === 'done' && 'opacity-40',
                            isRunning && 'ring-2 ring-primary/20'
                          )}
                        >
                          {/* Drag handle */}
                          <button
                            {...dragHandleListeners}
                            {...dragHandleAttributes}
                            className="flex-shrink-0 h-9 w-5 rounded flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing transition-colors touch-none"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>

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
                                className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                title="Start timer"
                              >
                                <Play className="h-4 w-4 fill-current" />
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
                                className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                title="Resume timer"
                              >
                                <Play className="h-4 w-4 fill-current" />
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
                                className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                                title="Pause timer"
                              >
                                <Pause className="h-4 w-4 fill-current" />
                              </motion.button>
                            )}
                          </AnimatePresence>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'font-medium text-sm text-foreground leading-snug',
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
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {cat && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: cat.color }}>
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </div>
                              )}
                              <span className="text-muted-foreground/40 text-xs">&middot;</span>
                              <span className="text-xs text-muted-foreground/70">{task.type}</span>
                              {task.estimatedDuration && task.estimatedDuration > 0 && (
                                <>
                                  <span className="text-muted-foreground/40 text-xs">&middot;</span>
                                  <span className="text-xs text-muted-foreground/70 tabular-nums">
                                    {formatDuration(task.estimatedDuration)}
                                  </span>
                                </>
                              )}
                              {due && (
                                <>
                                  <span className="text-muted-foreground/40 text-xs">&middot;</span>
                                  <Badge variant={due.variant} className="text-xs font-normal">
                                    {due.label}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Complete Button (right side) */}
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
                              'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                              task.status === 'done'
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'opacity-0 group-hover:opacity-100 bg-muted/60 hover:bg-green-500/20 text-muted-foreground hover:text-green-600'
                            )}
                            title={task.status === 'done' ? 'Completed' : 'Mark as complete'}
                          >
                            <Check className="h-4 w-4" />
                          </motion.button>

                          {/* Return to backlog (top-right corner) */}
                          <motion.button
                            whileHover={{ scale: 1.15, x: 2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (hasStarted) {
                                stopTimer(task.id)
                              }
                              onRemoveFromToday(task.id)
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/60 text-muted-foreground/50 hover:text-foreground/70"
                            title="Return to backlog"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </motion.button>
                        </motion.div>
                      )}
                    </SortableTodayItem>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Global Study Time Footer */}
      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 border-t border-border/20 overflow-hidden"
          >
            <div className="px-4 py-3 bg-background/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Study Time</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatTime(totalStudySeconds)}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {Object.values(timerStates).filter(s => s.isRunning && !s.isPaused).length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal Development Tracker */}
      <PersonalDevTracker />
    </motion.div>
  )
}
