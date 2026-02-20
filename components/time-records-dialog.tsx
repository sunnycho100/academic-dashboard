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
  Settings,
  Trash2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, subDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { loadPersonalDevColors } from '@/components/color-scheme-dialog'

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
const DEFAULT_START_HOUR = 6 // 6 AM
const DEFAULT_END_HOUR = 24 // midnight
const HOUR_HEIGHT = 80 // px per hour
const QUARTER_HEIGHT = HOUR_HEIGHT / 4

/**
 * Return the "logical today" date given day boundaries.
 * If timelineEndHour > 24 (e.g. 27 = 3 AM next day) and the current wall-clock
 * time is past midnight but before the extension hour, we are still in the
 * previous calendar day's logical window.
 */
function getLogicalToday(timelineStartHour: number, timelineEndHour: number): Date {
  const now = new Date()
  const currentHour = now.getHours()
  // Extension hours past midnight (e.g. endHour 27 → extensionHour 3)
  const extensionHour = timelineEndHour > 24 ? timelineEndHour - 24 : 0
  // If it's between midnight and the extension hour, we're still in yesterday's logical day
  if (extensionHour > 0 && currentHour < extensionHour) {
    return subDays(now, 1)
  }
  // Also if it's before the day-start hour (e.g. 10 AM) and there IS an extension,
  // the previous day's window has already ended — this is a new day not yet started.
  // In that case we still show "today" as the current calendar date.
  return now
}

function isLogicalToday(
  date: Date,
  timelineStartHour: number,
  timelineEndHour: number
): boolean {
  const logicalToday = getLogicalToday(timelineStartHour, timelineEndHour)
  return date.toDateString() === logicalToday.toDateString()
}

// ── Helpers ──
function formatDurationShort(seconds: number): string {
  const abs = Math.abs(seconds)
  const sign = seconds < 0 ? '-' : ''
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  if (h > 0 && m > 0) return `${sign}${h}h ${m}m`
  if (h > 0) return `${sign}${h}h`
  return `${sign}${m}m`
}

function formatTimeLabel(date: Date): string {
  return format(date, 'h:mm a')
}

function formatHourLabel(hour: number): string {
  const h = hour % 24
  const h12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12}:00 ${ampm}`
}

function formatHourOption(hour: number, isNextDay: boolean): string {
  const h = hour % 24
  const h12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12} ${ampm}${isNextDay ? ' (+1)' : ''}`
}

function getBlockPosition(startTime: Date, endTime: Date, timelineStartHour: number) {
  let startHour = startTime.getHours() + startTime.getMinutes() / 60
  let endHour = endTime.getHours() + endTime.getMinutes() / 60
  // If times are past midnight (before timeline start), treat as next-day hours
  if (startHour < timelineStartHour) startHour += 24
  if (endHour < timelineStartHour) endHour += 24
  // Only wrap to next day if endHour is significantly before startHour (cross-midnight),
  // not when they're equal (zero-duration) or nearly equal
  if (endHour < startHour) endHour += 24
  const top = (startHour - timelineStartHour) * HOUR_HEIGHT + 16 // 16px top padding
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24) // min 24px
  return { top, height }
}

function getCurrentTimePosition(timelineStartHour: number, timelineEndHour: number): number | null {
  const now = new Date()
  let currentHour = now.getHours() + now.getMinutes() / 60
  if (currentHour < timelineStartHour) currentHour += 24
  if (currentHour < timelineStartHour || currentHour > timelineEndHour) return null
  return (currentHour - timelineStartHour) * HOUR_HEIGHT + 16 // 16px top padding
}

// ── Metric Card (animated, glassmorphism) ──
function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor,
  gradient,
  delay,
  show,
}: {
  icon: React.ElementType
  label: string
  value: string
  iconColor: string
  gradient: string
  delay: number
  show: boolean
}) {
  return (
    <motion.div
      className="flex-1 min-w-[110px] rounded-xl border border-white/[0.08] p-3 flex flex-col gap-1.5 relative overflow-hidden group"
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
      {/* Gradient background */}
      <div className={cn('absolute inset-0 opacity-[0.07] dark:opacity-[0.12]', gradient)} />
      {/* Glass surface */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/[0.03] dark:bg-white/[0.02]" />
      {/* Inset highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: iconColor + '18' }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</span>
        </div>
        <span className="text-xl font-bold tabular-nums tracking-tight mt-1 block">{value}</span>
      </div>
    </motion.div>
  )
}

// ── TimeBlock (glassmorphism) ──
function TimeBlock({ record, index, timelineStartHour }: { record: TimeRecord; index: number; timelineStartHour: number }) {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  const { top, height } = getBlockPosition(start, end, timelineStartHour)

  const isShort = height < 50
  const color = record.categoryColor

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
      className="absolute left-[72px] right-3 rounded-xl overflow-hidden cursor-default group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      title={`${record.taskTitle}\n${formatTimeLabel(start)} – ${formatTimeLabel(end)}\n${formatDurationShort(record.duration)}`}
    >
      {/* Layered glass background */}
      <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: color, opacity: 0.75 }} />
      <div className="absolute inset-0 rounded-xl backdrop-blur-md bg-gradient-to-br from-white/20 via-transparent to-black/10" />
      {/* Top inset highlight */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-xl" style={{ background: `linear-gradient(to right, ${color}00, ${color}80, ${color}00)` }} />
      {/* Left accent bar */}
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
      {/* Border */}
      <div className="absolute inset-0 rounded-xl border" style={{ borderColor: `${color}30` }} />
      <div className="h-full px-3.5 py-2 flex flex-col justify-center text-white relative z-10">
        <p
          className={cn(
            'font-bold leading-tight truncate drop-shadow-sm',
            isShort ? 'text-[11px]' : 'text-[13px]'
          )}
        >
          {record.categoryName} – {record.taskType}
        </p>
        {!isShort && (
          <p className="text-[12px] text-white/85 mt-0.5 truncate font-medium">
            {record.taskTitle}
          </p>
        )}
        <p
          className={cn(
            'text-white/65 tabular-nums font-medium',
            isShort ? 'text-[9px]' : 'text-[10px] mt-1'
          )}
        >
          {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
        </p>
      </div>
    </motion.div>
  )
}

// ── Current Time Indicator ──
function CurrentTimeLine({ date, timelineStartHour, timelineEndHour }: { date: Date; timelineStartHour: number; timelineEndHour: number }) {
  const [position, setPosition] = useState<number | null>(null)

  useEffect(() => {
    const now = new Date()
    const isToday = isLogicalToday(date, timelineStartHour, timelineEndHour)
    if (!isToday) {
      setPosition(null)
      return
    }

    const update = () => setPosition(getCurrentTimePosition(timelineStartHour, timelineEndHour))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [date, timelineStartHour, timelineEndHour])

  if (position === null) return null

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="relative flex items-center">
        <div className="absolute left-[72px] right-3 h-[2px] bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500/50 shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
        <div className="absolute left-[66px] w-3 h-3 rounded-full bg-rose-500 border-2 border-background shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <span className="absolute right-4 -top-3 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md tabular-nums shadow-lg">
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
  // Will be overridden to logical today once day boundaries load
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showContent, setShowContent] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ taskTitle: '', startTime: '', endTime: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ taskTitle: '', categoryName: '', categoryColor: '#6366f1', taskType: '', startTime: '', endTime: '' })
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([])
  const [customCategoryMode, setCustomCategoryMode] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Configurable day boundaries
  const [timelineStartHour, setTimelineStartHour] = useState(DEFAULT_START_HOUR)
  const [timelineEndHour, setTimelineEndHour] = useState(DEFAULT_END_HOUR)
  const totalHours = timelineEndHour - timelineStartHour

  // Persist day boundary preferences & set logical today on mount
  useEffect(() => {
    const saved = localStorage.getItem('timeRecords-dayBoundaries')
    if (saved) {
      try {
        const { start, end } = JSON.parse(saved)
        if (typeof start === 'number') setTimelineStartHour(start)
        if (typeof end === 'number') {
          setTimelineEndHour(end)
          // Adjust initial selected date to logical today
          setSelectedDate(getLogicalToday(start, end))
        }
      } catch {}
    }
  }, [])

  const handleStartHourChange = (val: number) => {
    setTimelineStartHour(val)
    const newEnd = timelineEndHour <= val ? val + 18 : timelineEndHour
    localStorage.setItem('timeRecords-dayBoundaries', JSON.stringify({ start: val, end: newEnd }))
    if (newEnd !== timelineEndHour) setTimelineEndHour(newEnd)
  }

  const handleEndHourChange = (val: number) => {
    setTimelineEndHour(val)
    localStorage.setItem('timeRecords-dayBoundaries', JSON.stringify({ start: timelineStartHour, end: val }))
  }

  // Staggered reveal: first show the backdrop + container, then reveal the content
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowContent(true), 150)
      // Fetch categories
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => setCategories(data.map((c: { name: string; color: string }) => ({ name: c.name, color: c.color }))))
        .catch(() => {})
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
      setCustomCategoryMode(false)
      setCustomCategoryName('')
    }
  }, [open])

  // Fetch records when dialog opens or date/boundaries change
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const tzOffset = new Date().getTimezoneOffset()
    const endHourParam = timelineEndHour > 24 ? timelineEndHour - 24 : 0
    fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${timelineStartHour}&endHour=${endHourParam}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setRecords([])
        setLoading(false)
      })
  }, [open, selectedDate, timelineStartHour, timelineEndHour])

  // Scroll to first record or current time on load
  useEffect(() => {
    if (!open || loading || !scrollRef.current) return
    const timer = setTimeout(() => {
      const container = scrollRef.current
      if (!container) return
      const pos = getCurrentTimePosition(timelineStartHour, timelineEndHour)
      if (pos !== null) {
        container.scrollTop = Math.max(0, pos - 100)
      } else if (records.length > 0) {
        const firstStart = new Date(records[0].startTime)
        let firstHour = firstStart.getHours() + firstStart.getMinutes() / 60
        if (firstHour < timelineStartHour) firstHour += 24
        container.scrollTop = Math.max(0, (firstHour - timelineStartHour) * HOUR_HEIGHT - 40)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [open, loading, records, timelineStartHour, timelineEndHour])

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
    const isTodayDate = isLogicalToday(selectedDate, timelineStartHour, timelineEndHour)

    const dayStart = new Date(selectedDate)
    dayStart.setHours(timelineStartHour % 24, 0, 0, 0)

    let dayEnd: Date
    if (isTodayDate) {
      dayEnd = now
    } else {
      dayEnd = new Date(selectedDate)
      if (timelineEndHour > 24) {
        dayEnd.setDate(dayEnd.getDate() + 1)
        dayEnd.setHours(timelineEndHour % 24, 0, 0, 0)
      } else {
        dayEnd.setHours(timelineEndHour === 24 ? 23 : timelineEndHour, timelineEndHour === 24 ? 59 : 0, 0, 0)
      }
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
  }, [records, selectedDate, timelineStartHour, timelineEndHour])

  const logicalToday = useMemo(
    () => getLogicalToday(timelineStartHour, timelineEndHour),
    [timelineStartHour, timelineEndHour]
  )
  const isToday = selectedDate.toDateString() === logicalToday.toDateString()

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1))
  const handleNextDay = () => {
    const tomorrow = addDays(selectedDate, 1)
    if (tomorrow <= logicalToday) {
      setSelectedDate(tomorrow)
    }
  }
  const handleToday = () => setSelectedDate(getLogicalToday(timelineStartHour, timelineEndHour))

  const handleClose = () => {
    setShowContent(false)
    setEditMode(false)
    setEditingId(null)
    setAddingNew(false)
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
  const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => {
    const hour = timelineStartHour + i
    return { hour, label: formatHourLabel(hour) }
  })

  // Refetch helper
  const refetch = () => {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const tzOffset = new Date().getTimezoneOffset()
    const endHourParam = timelineEndHour > 24 ? timelineEndHour - 24 : 0
    fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${timelineStartHour}&endHour=${endHourParam}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setRecords([])
        setLoading(false)
      })
  }

  // ── Edit handlers ──
  const handleStartEdit = (record: TimeRecord) => {
    setEditingId(record.id)
    const start = new Date(record.startTime)
    const end = new Date(record.endTime)
    setEditForm({
      taskTitle: record.taskTitle,
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
    })
  }

  const handleSaveEdit = async (id: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const startDt = new Date(`${dateStr}T${editForm.startTime}:00`)
    const endDt = new Date(`${dateStr}T${editForm.endTime}:00`)
    // If end time is before start time, it crosses midnight — push end to next day
    if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1)
    const startTime = startDt.toISOString()
    const endTime = endDt.toISOString()
    await fetch(`/api/time-records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle: editForm.taskTitle, startTime, endTime }),
    })
    setEditingId(null)
    refetch()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/time-records/${id}`, { method: 'DELETE' })
    refetch()
  }

  const handleAddNew = async () => {
    if (!newForm.taskTitle || !newForm.startTime || !newForm.endTime) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const startDt = new Date(`${dateStr}T${newForm.startTime}:00`)
    const endDt = new Date(`${dateStr}T${newForm.endTime}:00`)
    // If end time is before start time, it crosses midnight — push end to next day
    if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1)
    const startTime = startDt.toISOString()
    const endTime = endDt.toISOString()
    const duration = Math.round((endDt.getTime() - startDt.getTime()) / 1000)
    await fetch('/api/time-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: null,
        taskTitle: newForm.taskTitle,
        categoryName: newForm.categoryName || 'Manual',
        categoryColor: newForm.categoryColor,
        taskType: newForm.taskType || 'Manual',
        startTime,
        endTime,
        duration,
      }),
    })

    // If this is a Personal Dev activity added for today, update the localStorage timer
    const isPersonalDev = newForm.categoryName === 'Personal Dev'
    const isToday = isLogicalToday(selectedDate, timelineStartHour, timelineEndHour)
    if (isPersonalDev && isToday && duration > 0) {
      const PERSONAL_DEV_KEYS: Record<string, string> = {
        'Reading': 'reading',
        'Project': 'project',
        'Job App': 'job-application',
      }
      const activityKey = PERSONAL_DEV_KEYS[newForm.taskTitle]
      if (activityKey) {
        try {
          const raw = localStorage.getItem('personal-dev-timers')
          const timers = raw ? JSON.parse(raw) : {}
          const current = timers[activityKey] || { isRunning: false, elapsedSeconds: 0, segmentStartedAt: null }
          timers[activityKey] = { ...current, elapsedSeconds: current.elapsedSeconds + duration }
          localStorage.setItem('personal-dev-timers', JSON.stringify(timers))
        } catch {}
      }
    }

    setAddingNew(false)
    setNewForm({ taskTitle: '', categoryName: '', categoryColor: '#6366f1', taskType: '', startTime: '', endTime: '' })
    // Optimistic insert — no loading flash
    const newRecord: TimeRecord = {
      id: crypto.randomUUID(),
      taskId: null,
      taskTitle: newForm.taskTitle,
      categoryName: newForm.categoryName || 'Manual',
      categoryColor: newForm.categoryColor,
      taskType: newForm.taskType || 'Manual',
      startTime,
      endTime,
      duration,
    }
    setRecords((prev) => [...prev, newRecord].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    ))
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
                className="relative glass-overlay border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                  className="h-[2px] bg-gradient-to-r from-blue-500/80 via-cyan-400/80 to-emerald-400/80"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                  style={{ transformOrigin: 'left' }}
                />

                {/* Header */}
                <motion.div
                  className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -10 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm flex items-center justify-center border border-blue-500/10"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                      >
                        <CalendarDays className="h-4.5 w-4.5 text-blue-400" />
                      </motion.div>
                      <div>
                        <h2 className="text-lg font-bold tracking-tight">Time Records</h2>
                        <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
                          Your daily focus timeline
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleClose}
                      className="rounded-full p-1.5 hover:bg-white/10 transition-colors"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <X className="h-4 w-4 text-muted-foreground/60" />
                    </motion.button>
                  </div>

                  {/* Date navigation + Edit toggle */}
                  <div className="flex items-center justify-between">
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
                          'text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-200',
                          isToday
                            ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/15 text-blue-400 border border-blue-500/10'
                            : 'text-muted-foreground/70 hover:text-foreground hover:bg-white/5'
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
                        disabled={addDays(selectedDate, 1) > logicalToday}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => setAddingNew(!addingNew)}
                        title="Add record manually"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={editMode ? 'secondary' : 'ghost'}
                        size="icon"
                        className={cn('h-7 w-7 rounded-lg', editMode && 'bg-primary/10 text-primary')}
                        onClick={() => { setEditMode(!editMode); setEditingId(null); setAddingNew(false) }}
                        title="Edit records"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Day boundary selects */}
                  <AnimatePresence>
                    {editMode && (
                      <motion.div
                        className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]"
                        initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12, paddingTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold whitespace-nowrap">Start</label>
                          <select
                            value={timelineStartHour}
                            onChange={(e) => handleStartHourChange(Number(e.target.value))}
                            className="h-7 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {Array.from({ length: 13 }, (_, i) => (
                              <option key={i} value={i}>
                                {formatHourOption(i, false)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold whitespace-nowrap">End</label>
                          <select
                            value={timelineEndHour}
                            onChange={(e) => handleEndHourChange(Number(e.target.value))}
                            className="h-7 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {Array.from({ length: 13 }, (_, i) => {
                              const hour = 18 + i // 6 PM through 6 AM next day
                              const isNextDay = hour > 24
                              return (
                                <option key={hour} value={hour}>
                                  {formatHourOption(hour, isNextDay)}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Analytics Cards */}
                <div className="px-6 py-4 flex gap-3 flex-wrap flex-shrink-0 border-b border-white/[0.06]">
                  <MetricCard
                    icon={Clock}
                    label="Total Focus"
                    value={analytics.totalFocus}
                    iconColor="hsl(210, 100%, 60%)"
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                    delay={0.08}
                    show={showContent}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Longest"
                    value={analytics.longestSession}
                    iconColor="hsl(35, 95%, 60%)"
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                    delay={0.12}
                    show={showContent}
                  />
                  <MetricCard
                    icon={Coffee}
                    label="Idle Time"
                    value={analytics.idleTime}
                    iconColor="hsl(0, 0%, 60%)"
                    gradient="bg-gradient-to-br from-slate-400 to-slate-500"
                    delay={0.16}
                    show={showContent}
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="Productive"
                    value={analytics.productivityRatio}
                    iconColor="hsl(140, 70%, 50%)"
                    gradient="bg-gradient-to-br from-emerald-500 to-green-500"
                    delay={0.20}
                    show={showContent}
                  />
                </div>

                {/* Timeline or Edit List */}
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
                  ) : editMode ? (
                    /* ── Edit Mode: list view ── */
                    <div className="overflow-y-auto px-6 py-3" style={{ maxHeight: 'calc(85vh - 300px)' }}>
                      <div className="space-y-2">
                        {records.map((record) => {
                          const isEditing = editingId === record.id
                          const start = new Date(record.startTime)
                          const end = new Date(record.endTime)

                          return (
                            <motion.div
                              key={record.id}
                              layout
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5"
                            >
                              {/* Color dot */}
                              <div
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: record.categoryColor }}
                              />

                              {isEditing ? (
                                /* Inline edit form */
                                <div className="flex-1 flex items-center gap-2 flex-wrap">
                                  <Input
                                    value={editForm.taskTitle}
                                    onChange={(e) => setEditForm({ ...editForm, taskTitle: e.target.value })}
                                    className="h-7 text-xs flex-1 min-w-[100px]"
                                    placeholder="Title"
                                  />
                                  <Input
                                    type="time"
                                    value={editForm.startTime}
                                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                    className="h-7 text-xs w-[90px]"
                                  />
                                  <span className="text-xs text-muted-foreground">–</span>
                                  <Input
                                    type="time"
                                    value={editForm.endTime}
                                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                    className="h-7 text-xs w-[90px]"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary"
                                    onClick={() => handleSaveEdit(record.id)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                /* Display row */
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{record.taskTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {record.categoryName} · {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                    onClick={() => handleStartEdit(record)}
                                    title="Edit"
                                  >
                                    <Settings className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDelete(record.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </motion.div>
                          )
                        })}

                        {/* Add new record form */}
                        {addingNew && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 space-y-2"
                          >
                            {/* Quick-pick presets for Personal Dev */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground mr-1">Quick:</span>
                              {(() => {
                                const pdColors = loadPersonalDevColors()
                                return [
                                  { label: 'Reading', key: 'reading' },
                                  { label: 'Project', key: 'project' },
                                  { label: 'Job App', key: 'job-application' },
                                ].map((preset) => {
                                  const color = pdColors[preset.key]
                                  return (
                                    <Button
                                      key={preset.label}
                                      type="button"
                                      variant={newForm.taskTitle === preset.label && newForm.categoryName === 'Personal Dev' ? 'secondary' : 'outline'}
                                      size="sm"
                                      className="h-6 px-2 text-[10px] gap-1"
                                      onClick={() => setNewForm({
                                        ...newForm,
                                        taskTitle: preset.label,
                                        categoryName: 'Personal Dev',
                                        categoryColor: color,
                                        taskType: preset.label,
                                      })}
                                    >
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                      {preset.label}
                                    </Button>
                                  )
                                })
                              })()}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input
                                value={newForm.taskTitle}
                                onChange={(e) => setNewForm({ ...newForm, taskTitle: e.target.value })}
                                className="h-7 text-xs flex-1 min-w-[100px]"
                                placeholder="Title (e.g. A02 Review)"
                              />
                              {customCategoryMode ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={customCategoryName}
                                    onChange={(e) => setCustomCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customCategoryName.trim()) {
                                        setNewForm({ ...newForm, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                                        setCustomCategoryMode(false)
                                        setCustomCategoryName('')
                                      }
                                      if (e.key === 'Escape') { setCustomCategoryMode(false); setCustomCategoryName('') }
                                    }}
                                    autoFocus
                                    className="h-7 text-xs w-[90px]"
                                    placeholder="New category"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1.5 text-xs text-primary"
                                    onClick={() => {
                                      if (customCategoryName.trim()) {
                                        setNewForm({ ...newForm, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                                      }
                                      setCustomCategoryMode(false)
                                      setCustomCategoryName('')
                                    }}
                                  >
                                    OK
                                  </Button>
                                </div>
                              ) : (
                                <select
                                  value={newForm.categoryName}
                                  onChange={(e) => {
                                    if (e.target.value === '__add_new__') {
                                      setCustomCategoryMode(true)
                                      return
                                    }
                                    const cat = categories.find((c) => c.name === e.target.value)
                                    setNewForm({ ...newForm, categoryName: e.target.value, categoryColor: cat?.color || '#6366f1' })
                                  }}
                                  className="h-7 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring min-w-[100px]"
                                >
                                  <option value="">Category</option>
                                  {categories.map((cat) => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                  ))}
                                  <option value="__add_new__">+ Add New</option>
                                </select>
                              )}
                              <Input
                                type="time"
                                value={newForm.startTime}
                                onChange={(e) => setNewForm({ ...newForm, startTime: e.target.value })}
                                className="h-7 text-xs w-[90px]"
                              />
                              <span className="text-xs text-muted-foreground">–</span>
                              <Input
                                type="time"
                                value={newForm.endTime}
                                onChange={(e) => setNewForm({ ...newForm, endTime: e.target.value })}
                                className="h-7 text-xs w-[90px]"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary"
                                onClick={handleAddNew}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setAddingNew(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {records.length === 0 && !addingNew && (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground/50">No records to edit</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(85vh - 300px)' }}>
                      {/* Inline add form (shown when + is clicked from header) */}
                      <AnimatePresence>
                        {addingNew && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-4 py-3 border-b border-white/10 flex-shrink-0"
                          >
                            <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground mr-1">Quick:</span>
                                {(() => {
                                  const pdColors = loadPersonalDevColors()
                                  return [
                                    { label: 'Reading', key: 'reading' },
                                    { label: 'Project', key: 'project' },
                                    { label: 'Job App', key: 'job-application' },
                                  ].map((preset) => {
                                    const color = pdColors[preset.key]
                                    return (
                                      <Button
                                        key={preset.label}
                                        type="button"
                                        variant={newForm.taskTitle === preset.label && newForm.categoryName === 'Personal Dev' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="h-6 px-2 text-[10px] gap-1"
                                        onClick={() => setNewForm({
                                          ...newForm,
                                          taskTitle: preset.label,
                                          categoryName: 'Personal Dev',
                                          categoryColor: color,
                                          taskType: preset.label,
                                        })}
                                      >
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                        {preset.label}
                                      </Button>
                                    )
                                  })
                                })()}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Input
                                  value={newForm.taskTitle}
                                  onChange={(e) => setNewForm({ ...newForm, taskTitle: e.target.value })}
                                  className="h-7 text-xs flex-1 min-w-[100px]"
                                  placeholder="Title (e.g. A02 Review)"
                                />
                                {customCategoryMode ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={customCategoryName}
                                      onChange={(e) => setCustomCategoryName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && customCategoryName.trim()) {
                                          setNewForm({ ...newForm, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                                          setCustomCategoryMode(false)
                                          setCustomCategoryName('')
                                        }
                                        if (e.key === 'Escape') { setCustomCategoryMode(false); setCustomCategoryName('') }
                                      }}
                                      autoFocus
                                      className="h-7 text-xs w-[90px]"
                                      placeholder="New category"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-1.5 text-xs text-primary"
                                      onClick={() => {
                                        if (customCategoryName.trim()) {
                                          setNewForm({ ...newForm, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                                        }
                                        setCustomCategoryMode(false)
                                        setCustomCategoryName('')
                                      }}
                                    >
                                      OK
                                    </Button>
                                  </div>
                                ) : (
                                  <select
                                    value={newForm.categoryName}
                                    onChange={(e) => {
                                      if (e.target.value === '__add_new__') {
                                        setCustomCategoryMode(true)
                                        return
                                      }
                                      const cat = categories.find((c) => c.name === e.target.value)
                                      setNewForm({ ...newForm, categoryName: e.target.value, categoryColor: cat?.color || '#6366f1' })
                                    }}
                                    className="h-7 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring min-w-[100px]"
                                  >
                                    <option value="">Category</option>
                                    {categories.map((cat) => (
                                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                    <option value="__add_new__">+ Add New</option>
                                  </select>
                                )}
                                <Input
                                  type="time"
                                  value={newForm.startTime}
                                  onChange={(e) => setNewForm({ ...newForm, startTime: e.target.value })}
                                  className="h-7 text-xs w-[90px]"
                                />
                                <span className="text-xs text-muted-foreground">–</span>
                                <Input
                                  type="time"
                                  value={newForm.endTime}
                                  onChange={(e) => setNewForm({ ...newForm, endTime: e.target.value })}
                                  className="h-7 text-xs w-[90px]"
                                />
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={handleAddNew}>Save</Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAddingNew(false)}>Cancel</Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto px-2"
                      >
                      <div
                        className="relative"
                        style={{ height: `${totalHours * HOUR_HEIGHT + 16}px`, paddingTop: '16px' }}
                      >
                        {/* Hour grid lines and labels */}
                        {hourLabels.map(({ hour, label }, i) => {
                          const y = i * HOUR_HEIGHT + 16
                          return (
                            <div key={hour} className="absolute left-0 right-0" style={{ top: `${y}px` }}>
                              <span className="absolute left-2 -top-[9px] text-[10px] font-semibold text-muted-foreground/40 tabular-nums select-none tracking-wide">
                                {label}
                              </span>
                              <div className="absolute left-[72px] right-3 h-px bg-white/[0.04] dark:bg-white/[0.06]" />
                              {i < totalHours &&
                                [1, 2, 3].map((q) => (
                                  <div
                                    key={q}
                                    className="absolute left-[72px] right-3 h-px bg-white/[0.02] dark:bg-white/[0.03]"
                                    style={{ top: `${q * QUARTER_HEIGHT}px` }}
                                  />
                                ))}
                            </div>
                          )
                        })}

                        {/* Time blocks */}
                        <AnimatePresence>
                          {records.map((record, i) => (
                            <TimeBlock key={record.id} record={record} index={i} timelineStartHour={timelineStartHour} />
                          ))}
                        </AnimatePresence>

                        {/* Current time line */}
                        <CurrentTimeLine date={selectedDate} timelineStartHour={timelineStartHour} timelineEndHour={timelineEndHour} />

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
                    </div>
                  )}
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-end gap-2 flex-shrink-0"
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
