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
import {
  MetricCard,
  TimeBlock,
  CurrentTimeLine,
  TimeRecordForm,
  type TimeRecord,
  type NewRecordForm,
  HOUR_HEIGHT,
  QUARTER_HEIGHT,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  formatDurationShort,
  formatTimeLabel,
  formatHourLabel,
  formatHourOption,
  getCurrentTimePosition,
  getLogicalToday,
  isLogicalToday,
  buildDateFromLogicalDay,
} from '@/components/time-records'

interface TimeRecordsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [newForm, setNewForm] = useState<NewRecordForm>({ taskTitle: '', categoryName: '', categoryColor: '#6366f1', taskType: '', startTime: '', endTime: '' })
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([])
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

  // Reveal content immediately with dialog and fetch categories
  useEffect(() => {
    if (open) {
      setShowContent(true)
      // Fetch categories
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => setCategories(data.map((c: { name: string; color: string }) => ({ name: c.name, color: c.color }))))
        .catch(() => {})
    } else {
      setShowContent(false)
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
    const startDt = buildDateFromLogicalDay(selectedDate, editForm.startTime, timelineStartHour, timelineEndHour)
    const endDt = buildDateFromLogicalDay(selectedDate, editForm.endTime, timelineStartHour, timelineEndHour)
    // If end time is still before or equal to start time, it crosses midnight — push end to next day
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
    const startDt = buildDateFromLogicalDay(selectedDate, newForm.startTime, timelineStartHour, timelineEndHour)
    const endDt = buildDateFromLogicalDay(selectedDate, newForm.endTime, timelineStartHour, timelineEndHour)
    // If end time is still before or equal to start time, it crosses midnight — push end to next day
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
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.6,
              }}
            >
              <motion.div
                className="relative glass-overlay border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full"
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
                    <div className="flex items-center justify-center text-muted-foreground" style={{ maxHeight: 'calc(85vh - 300px)', minHeight: '400px' }}>
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
                          <TimeRecordForm
                            form={newForm}
                            onFormChange={setNewForm}
                            categories={categories}
                            onSave={handleAddNew}
                            onCancel={() => setAddingNew(false)}
                          />
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
                            <TimeRecordForm
                              form={newForm}
                              onFormChange={setNewForm}
                              categories={categories}
                              onSave={handleAddNew}
                              onCancel={() => setAddingNew(false)}
                            />
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
