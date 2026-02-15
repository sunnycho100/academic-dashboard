'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Zap,
  Coffee,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, subDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface TimeRecord {
  id: string
  taskId: string | null
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
  startTime: string
  endTime: string
  duration: number // seconds
}

interface TimeRecordsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Constants ──
const TIMELINE_START_HOUR = 6 // 6 AM
const TIMELINE_END_HOUR = 24 // midnight
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR
const HOUR_HEIGHT = 80 // px per hour
const QUARTER_HEIGHT = HOUR_HEIGHT / 4

// ── Helpers ──
function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function formatTimeLabel(date: Date): string {
  return format(date, 'h:mm a')
}

function getBlockPosition(startTime: Date, endTime: Date) {
  const startHour = startTime.getHours() + startTime.getMinutes() / 60
  const endHour = endTime.getHours() + endTime.getMinutes() / 60
  const top = (startHour - TIMELINE_START_HOUR) * HOUR_HEIGHT
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24) // min 24px
  return { top, height }
}

function getCurrentTimePosition(): number | null {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  if (currentHour < TIMELINE_START_HOUR || currentHour > TIMELINE_END_HOUR) return null
  return (currentHour - TIMELINE_START_HOUR) * HOUR_HEIGHT
}

// ── Metric Card (animated) ──
function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor,
  delay,
  show,
}: {
  icon: React.ElementType
  label: string
  value: string
  iconColor: string
  delay: number
  show: boolean
}) {
  return (
    <motion.div
      className="flex-1 min-w-[110px] rounded-xl bg-muted/40 border border-border/30 p-3 flex flex-col gap-1"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 12,
        scale: show ? 1 : 0.95,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        delay,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconColor + '20' }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold tabular-nums tracking-tight">{value}</span>
    </motion.div>
  )
}

// ── TimeBlock ──
function TimeBlock({ record, index }: { record: TimeRecord; index: number }) {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  const { top, height } = getBlockPosition(start, end)

  const isShort = height < 50

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scaleY: 0.85 }}
      animate={{ opacity: 1, x: 0, scaleY: 1 }}
      exit={{ opacity: 0, x: -20, scaleY: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
        delay: index * 0.06,
      }}
      className="absolute left-[72px] right-3 rounded-lg overflow-hidden shadow-md cursor-default group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: record.categoryColor,
        opacity: 0.92,
      }}
      title={`${record.taskTitle}\n${formatTimeLabel(start)} – ${formatTimeLabel(end)}\n${formatDurationShort(record.duration)}`}
    >
      <div className="h-full px-3 py-1.5 flex flex-col justify-center text-white relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20 pointer-events-none" />
        <div className="relative z-10">
          <p
            className={cn(
              'font-semibold leading-tight truncate',
              isShort ? 'text-[11px]' : 'text-sm'
            )}
          >
            {record.categoryName} – {record.taskType}
          </p>
          {!isShort && (
            <p className="text-xs text-white/80 mt-0.5 truncate">
              {record.taskTitle}
            </p>
          )}
          <p
            className={cn(
              'text-white/70 tabular-nums',
              isShort ? 'text-[10px]' : 'text-[11px] mt-0.5'
            )}
          >
            {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Current Time Indicator ──
function CurrentTimeLine({ date }: { date: Date }) {
  const [position, setPosition] = useState<number | null>(null)

  useEffect(() => {
    const now = new Date()
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    if (!isToday) {
      setPosition(null)
      return
    }

    const update = () => setPosition(getCurrentTimePosition())
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [date])

  if (position === null) return null

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="relative flex items-center">
        <div className="absolute left-[72px] right-3 h-[2px] bg-red-500/80" />
        <div className="absolute left-[66px] w-3 h-3 rounded-full bg-red-500 border-2 border-background shadow-sm" />
        <span className="absolute right-4 -top-3 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums">
          {format(new Date(), 'h:mm a')}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ──
export function TimeRecordsDialog({ open, onOpenChange }: TimeRecordsDialogProps) {
  const [records, setRecords] = useState<TimeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showContent, setShowContent] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Staggered reveal: first show the backdrop + container, then reveal the content
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowContent(true), 150)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [open])

  // Fetch records when dialog opens or date changes
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    fetch(`/api/time-records?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setRecords([])
        setLoading(false)
      })
  }, [open, selectedDate])

  // Scroll to first record or current time on load
  useEffect(() => {
    if (!open || loading || !scrollRef.current) return
    const timer = setTimeout(() => {
      const container = scrollRef.current
      if (!container) return
      const pos = getCurrentTimePosition()
      if (pos !== null) {
        container.scrollTop = Math.max(0, pos - 100)
      } else if (records.length > 0) {
        const firstStart = new Date(records[0].startTime)
        const firstHour = firstStart.getHours() + firstStart.getMinutes() / 60
        container.scrollTop = Math.max(0, (firstHour - TIMELINE_START_HOUR) * HOUR_HEIGHT - 40)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [open, loading, records])

  // ── Analytics ──
  const analytics = useMemo(() => {
    if (!Array.isArray(records) || records.length === 0) {
      return {
        totalFocus: '0m',
        longestSession: '0m',
        idleTime: '—',
        productivityRatio: '0%',
      }
    }

    const totalSeconds = records.reduce((sum, r) => sum + r.duration, 0)
    const longestSeconds = Math.max(...records.map((r) => r.duration))

    const now = new Date()
    const isTodayDate =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()

    const dayStart = new Date(selectedDate)
    dayStart.setHours(TIMELINE_START_HOUR, 0, 0, 0)

    let dayEnd: Date
    if (isTodayDate) {
      dayEnd = now
    } else {
      dayEnd = new Date(selectedDate)
      dayEnd.setHours(22, 0, 0, 0)
    }

    const totalDaySeconds = Math.max(0, (dayEnd.getTime() - dayStart.getTime()) / 1000)
    const idleSeconds = Math.max(0, totalDaySeconds - totalSeconds)
    const ratio = totalDaySeconds > 0 ? Math.round((totalSeconds / totalDaySeconds) * 100) : 0

    return {
      totalFocus: formatDurationShort(totalSeconds),
      longestSession: formatDurationShort(longestSeconds),
      idleTime: formatDurationShort(idleSeconds),
      productivityRatio: `${ratio}%`,
    }
  }, [records, selectedDate])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1))
  const handleNextDay = () => {
    const tomorrow = addDays(selectedDate, 1)
    if (tomorrow <= new Date()) {
      setSelectedDate(tomorrow)
    }
  }
  const handleToday = () => setSelectedDate(new Date())

  const handleClose = () => {
    setShowContent(false)
    setTimeout(() => onOpenChange(false), 150)
  }

  const handleExport = () => {
    if (records.length === 0) return
    const lines = [
      `Time Records – ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`,
      '',
      'Task,Category,Type,Start,End,Duration',
      ...records.map((r) => {
        const start = new Date(r.startTime)
        const end = new Date(r.endTime)
        return `"${r.taskTitle}","${r.categoryName}","${r.taskType}","${formatTimeLabel(start)}","${formatTimeLabel(end)}","${formatDurationShort(r.duration)}"`
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `time-records-${format(selectedDate, 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Build hour labels
  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
    const hour = TIMELINE_START_HOUR + i
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    const ampm = hour < 12 ? 'AM' : 'PM'
    return { hour, label: `${h12}:00 ${ampm}` }
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Dialog container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              className="pointer-events-auto w-full max-w-2xl mx-4"
              initial={{ opacity: 0, scale: 0.75, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 28,
                mass: 0.8,
              }}
            >
              <motion.div
                className="relative bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '85vh' }}
                initial={{ boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' }}
                animate={{
                  boxShadow: showContent
                    ? '0 25px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.05)'
                    : '0 0 0 0 rgba(59, 130, 246, 0)',
                }}
                transition={{ duration: 0.4 }}
              >
                {/* Animated top gradient bar */}
                <motion.div
                  className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                  style={{ transformOrigin: 'left' }}
                />

                {/* Header */}
                <motion.div
                  className="px-6 pt-5 pb-4 border-b border-border/30 flex-shrink-0"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -10 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                      >
                        <CalendarDays className="h-5 w-5 text-blue-500" />
                      </motion.div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">View Time Records</h2>
                        <p className="text-xs text-muted-foreground">
                          Your daily focus timeline
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleClose}
                      className="rounded-full p-1.5 hover:bg-secondary/80 transition-colors"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  </div>

                  {/* Date navigation */}
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -12 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={handlePrevDay}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={handleToday}
                      className={cn(
                        'text-sm font-medium px-3 py-1 rounded-lg transition-colors',
                        isToday
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      {isToday ? 'Today' : format(selectedDate, 'EEEE')},{' '}
                      {format(selectedDate, 'MMMM d')}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={handleNextDay}
                      disabled={addDays(selectedDate, 1) > new Date()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Analytics Cards */}
                <div className="px-6 py-4 flex gap-3 flex-wrap flex-shrink-0 border-b border-border/20">
                  <MetricCard
                    icon={Clock}
                    label="Total Focus"
                    value={analytics.totalFocus}
                    iconColor="hsl(210, 100%, 50%)"
                    delay={0.08}
                    show={showContent}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Longest Session"
                    value={analytics.longestSession}
                    iconColor="hsl(35, 90%, 55%)"
                    delay={0.12}
                    show={showContent}
                  />
                  <MetricCard
                    icon={Coffee}
                    label="Idle Time"
                    value={analytics.idleTime}
                    iconColor="hsl(0, 0%, 55%)"
                    delay={0.16}
                    show={showContent}
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="Productivity"
                    value={analytics.productivityRatio}
                    iconColor="hsl(140, 60%, 45%)"
                    delay={0.20}
                    show={showContent}
                  />
                </div>

                {/* Timeline */}
                <motion.div
                  className="flex-1 min-h-0 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: showContent ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="h-4 w-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        Loading...
                      </motion.div>
                    </div>
                  ) : (
                    <div
                      ref={scrollRef}
                      className="h-full overflow-y-auto px-2"
                      style={{ maxHeight: 'calc(85vh - 300px)' }}
                    >
                      <div
                        className="relative"
                        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                      >
                        {/* Hour grid lines and labels */}
                        {hourLabels.map(({ hour, label }, i) => {
                          const y = i * HOUR_HEIGHT
                          return (
                            <div key={hour} className="absolute left-0 right-0" style={{ top: `${y}px` }}>
                              <span className="absolute left-2 -top-[9px] text-[11px] font-medium text-muted-foreground tabular-nums select-none">
                                {label}
                              </span>
                              <div className="absolute left-[72px] right-3 h-px bg-border/40" />
                              {i < TOTAL_HOURS &&
                                [1, 2, 3].map((q) => (
                                  <div
                                    key={q}
                                    className="absolute left-[72px] right-3 h-px bg-border/15"
                                    style={{ top: `${q * QUARTER_HEIGHT}px` }}
                                  />
                                ))}
                            </div>
                          )
                        })}

                        {/* Time blocks */}
                        <AnimatePresence>
                          {records.map((record, i) => (
                            <TimeBlock key={record.id} record={record} index={i} />
                          ))}
                        </AnimatePresence>

                        {/* Current time line */}
                        <CurrentTimeLine date={selectedDate} />

                        {/* Empty state */}
                        {records.length === 0 && !loading && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
                          >
                            <div className="text-center">
                              <motion.div
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                              </motion.div>
                              <p className="text-sm text-muted-foreground/50 font-medium">
                                No time records
                              </p>
                              <p className="text-xs text-muted-foreground/30 mt-1">
                                Start a timer on a task to begin tracking
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="px-6 py-3 border-t border-border/30 flex items-center justify-end gap-2 flex-shrink-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
                  transition={{ duration: 0.25, delay: 0.22 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={records.length === 0}
                    className="gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
