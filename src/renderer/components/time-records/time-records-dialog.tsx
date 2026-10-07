import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Settings, Trash2, Plus } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
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
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ taskTitle: '', startTime: '', endTime: '' })
  const [editOriginalDuration, setEditOriginalDuration] = useState(0) // seconds
  const [autoShiftEnd, setAutoShiftEnd] = useState(true)
  const [cascadeShift, setCascadeShift] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<NewRecordForm>({ taskTitle: '', categoryName: '', categoryColor: '#6366f1', taskType: '', startTime: '', endTime: '' })
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolled = useRef(false)

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

  // Fetch categories when the dialog opens
  useEffect(() => {
    if (!open) return
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.map((c: { name: string; color: string }) => ({ name: c.name, color: c.color }))))
      .catch(() => {})
  }, [open])

  // Fetch records when dialog opens or date/boundaries change. Only the first load
  // shows the spinner; stepping between days keeps the current day on screen until
  // the next one arrives, so the timeline is not torn down and rebuilt each time.
  const loadedOnceRef = useRef(false)
  useEffect(() => {
    if (!open) {
      loadedOnceRef.current = false
      return
    }
    if (!loadedOnceRef.current) setLoading(true)
    let stale = false
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const tzOffset = new Date().getTimezoneOffset()
    const endHourParam = timelineEndHour > 24 ? timelineEndHour - 24 : 0
    fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${timelineStartHour}&endHour=${endHourParam}`)
      .then((res) => res.json())
      .then((data) => {
        // A quicker click may have moved on already; ignore the older day's answer
        if (stale) return
        setRecords(Array.isArray(data) ? data : [])
        loadedOnceRef.current = true
        setLoading(false)
      })
      .catch(() => {
        if (stale) return
        setRecords([])
        setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [open, selectedDate, timelineStartHour, timelineEndHour])

  // Reset initial-scroll flag when dialog reopens
  useEffect(() => {
    if (!open) hasInitialScrolled.current = false
  }, [open])

  // Callback ref: scroll to current time immediately on mount (no flash)
  const scrollRefCallback = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node
    if (node && !hasInitialScrolled.current) {
      const pos = getCurrentTimePosition(timelineStartHour, timelineEndHour)
      if (pos !== null) {
        node.scrollTop = Math.max(0, pos - 100)
      }
      hasInitialScrolled.current = true
    }
  }, [timelineStartHour, timelineEndHour])

  // After records load, scroll to first record if current time isn't visible
  useEffect(() => {
    if (!open || loading || !scrollRef.current) return
    const container = scrollRef.current
    const pos = getCurrentTimePosition(timelineStartHour, timelineEndHour)
    if (pos !== null) {
      container.scrollTop = Math.max(0, pos - 100)
    } else if (records.length > 0) {
      const firstStart = new Date(records[0].startTime)
      let firstHour = firstStart.getHours() + firstStart.getMinutes() / 60
      if (firstHour < timelineStartHour) firstHour += 24
      container.scrollTop = Math.max(0, (firstHour - timelineStartHour) * HOUR_HEIGHT - 40)
    }
  }, [open, loading, records, timelineStartHour, timelineEndHour])

  // ── Analytics ──
  const analytics = useMemo(() => {
    if (!Array.isArray(records) || records.length === 0) {
      return {
        totalFocus: '0m',
        longestSession: '0m',
        idleTime: '–',
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

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditMode(false)
      setEditingId(null)
      setAddingNew(false)
    }
    onOpenChange(next)
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
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const tzOffset = new Date().getTimezoneOffset()
    const endHourParam = timelineEndHour > 24 ? timelineEndHour - 24 : 0
    fetch(`/api/time-records?date=${dateStr}&tz=${tzOffset}&startHour=${timelineStartHour}&endHour=${endHourParam}`)
      .then((res) => res.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  // ── Edit handlers ──
  const handleStartEdit = (record: TimeRecord) => {
    setEditingId(record.id)
    const start = new Date(record.startTime)
    const end = new Date(record.endTime)
    setEditOriginalDuration(record.duration)
    setEditForm({
      taskTitle: record.taskTitle,
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
    })
  }

  // When start time changes, auto-shift end time to preserve original duration
  const handleEditStartTimeChange = (newStartTime: string) => {
    if (autoShiftEnd) {
      const startDt = buildDateFromLogicalDay(selectedDate, newStartTime, timelineStartHour, timelineEndHour)
      const endDt = new Date(startDt.getTime() + editOriginalDuration * 1000)
      setEditForm({
        ...editForm,
        startTime: newStartTime,
        endTime: format(endDt, 'HH:mm'),
      })
    } else {
      setEditForm({ ...editForm, startTime: newStartTime })
    }
  }

  const handleSaveEdit = async (id: string) => {
    const startDt = buildDateFromLogicalDay(selectedDate, editForm.startTime, timelineStartHour, timelineEndHour)
    const endDt = buildDateFromLogicalDay(selectedDate, editForm.endTime, timelineStartHour, timelineEndHour)
    // If end time is still before or equal to start time, it crosses midnight — push end to next day
    if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1)
    const startTime = startDt.toISOString()
    const endTime = endDt.toISOString()

    // Calculate time delta for cascading
    const editedRecord = records.find((r) => r.id === id)
    const originalStartMs = editedRecord ? new Date(editedRecord.startTime).getTime() : startDt.getTime()
    const deltaMs = startDt.getTime() - originalStartMs

    // Save the edited record
    await fetch(`/api/time-records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle: editForm.taskTitle, startTime, endTime }),
    })

    // Cascade-shift all subsequent records by the same delta
    if (cascadeShift && deltaMs !== 0 && editedRecord) {
      const editedIndex = records.findIndex((r) => r.id === id)
      const subsequentRecords = records.slice(editedIndex + 1)
      await Promise.all(
        subsequentRecords.map((r) => {
          const newStart = new Date(new Date(r.startTime).getTime() + deltaMs).toISOString()
          const newEnd = new Date(new Date(r.endTime).getTime() + deltaMs).toISOString()
          return fetch(`/api/time-records/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: newStart, endTime: newEnd }),
          })
        })
      )
    }

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
        'Research': 'project',
        'Project': 'project', // records saved before the rename
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

  const selectClass =
    'h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] gap-0 p-0 flex flex-col overflow-hidden" aria-describedby={undefined}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="font-serif text-2xl font-normal">Time records</DialogTitle>

          {/* Date navigation + edit toggle */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevDay} aria-label="Previous day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleToday}
                className="px-1 text-sm text-foreground hover:text-muted-foreground transition-colors"
              >
                {isToday ? 'Today' : format(selectedDate, 'EEEE')},{' '}
                {format(selectedDate, 'MMMM d')}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextDay}
                disabled={addDays(selectedDate, 1) > logicalToday}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setAddingNew(!addingNew)}
                title="Add record manually"
                aria-label="Add record manually"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={editMode ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => { setEditMode(!editMode); setEditingId(null); setAddingNew(false) }}
                title="Edit records"
                aria-label="Edit records"
                aria-pressed={editMode}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Day boundary selects */}
          {editMode && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Start
                <select
                  value={timelineStartHour}
                  onChange={(e) => handleStartHourChange(Number(e.target.value))}
                  className={selectClass}
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHourOption(i, false)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                End
                <select
                  value={timelineEndHour}
                  onChange={(e) => handleEndHourChange(Number(e.target.value))}
                  className={selectClass}
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
              </label>

              <div className="flex-1" />

              <label
                className="flex items-center gap-2 text-xs text-muted-foreground select-none whitespace-nowrap"
                title="Auto-shift end time when start time changes"
              >
                <Switch checked={autoShiftEnd} onCheckedChange={setAutoShiftEnd} />
                Auto-shift
              </label>
              <label
                className="flex items-center gap-2 text-xs text-muted-foreground select-none whitespace-nowrap"
                title="Cascade shift subsequent records on save"
              >
                <Switch checked={cascadeShift} onCheckedChange={setCascadeShift} />
                Cascade
              </label>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 flex items-baseline gap-x-7 gap-y-3 flex-wrap flex-shrink-0 border-b border-border">
          <MetricCard label="focus" value={analytics.totalFocus} />
          <MetricCard label="longest" value={analytics.longestSession} />
          <MetricCard label="idle" value={analytics.idleTime} />
          <MetricCard label="productive" value={analytics.productivityRatio} />
        </div>

        {/* Timeline or edit list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[400px] max-h-[calc(85vh-300px)]">
              <div className="h-4 w-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
              Loading...
            </div>
          ) : editMode ? (
            /* Edit mode: list view */
            <div className="overflow-y-auto px-6 py-3 max-h-[calc(85vh-300px)]">
              <div className="space-y-2">
                {records.map((record) => {
                  const isEditing = editingId === record.id
                  const start = new Date(record.startTime)
                  const end = new Date(record.endTime)

                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                    >
                      {/* Color dot */}
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
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
                            onChange={(e) => handleEditStartTimeChange(e.target.value)}
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
                            size="sm"
                            className="h-7 rounded-full px-3 text-xs"
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
                            <p className="text-sm truncate">{record.taskTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.categoryName} · {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEdit(record)}
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(record.id)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
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
                  <p className="py-8 text-center text-sm text-muted-foreground">No records to edit</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[calc(85vh-300px)]">
              {/* Inline add form (shown when + is clicked from header) */}
              {addingNew && (
                <div className="px-4 py-3 border-b border-border flex-shrink-0">
                  <TimeRecordForm
                    form={newForm}
                    onFormChange={setNewForm}
                    categories={categories}
                    onSave={handleAddNew}
                    onCancel={() => setAddingNew(false)}
                  />
                </div>
              )}
              <div
                ref={scrollRefCallback}
                className="flex-1 overflow-y-auto px-2"
              >
                <div
                  className="relative pt-4"
                  style={{ height: `${totalHours * HOUR_HEIGHT + 16}px` }}
                >
                  {/* Hour grid lines and labels */}
                  {hourLabels.map(({ hour, label }, i) => {
                    const y = i * HOUR_HEIGHT + 16
                    return (
                      <div key={hour} className="absolute left-0 right-0" style={{ top: `${y}px` }}>
                        <span className="absolute left-2 -top-[9px] text-[10px] text-muted-foreground tabular-nums select-none">
                          {label}
                        </span>
                        <div className="absolute left-[72px] right-3 h-px bg-border" />
                        {i < totalHours &&
                          [1, 2, 3].map((q) => (
                            <div
                              key={q}
                              className="absolute left-[72px] right-3 h-px bg-border/40"
                              style={{ top: `${q * QUARTER_HEIGHT}px` }}
                            />
                          ))}
                      </div>
                    )
                  })}

                  {/* Time blocks */}
                  {records.map((record) => (
                    <TimeBlock key={record.id} record={record} timelineStartHour={timelineStartHour} />
                  ))}

                  {/* Current time line */}
                  <CurrentTimeLine date={selectedDate} timelineStartHour={timelineStartHour} timelineEndHour={timelineEndHour} />

                  {/* Empty state */}
                  {records.length === 0 && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">No time records</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Start a timer on a task to begin tracking
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end flex-shrink-0">
          <Button
            onClick={handleExport}
            disabled={records.length === 0}
            className="rounded-full px-5"
          >
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
