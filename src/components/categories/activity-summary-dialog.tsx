'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  History, 
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { format, parseISO, startOfDay, addHours, subHours, isSameDay } from 'date-fns'

interface CompletedTaskRecord {
  id: string
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
  dueAt: string
  completedAt: string
  actualTimeSpent: number | null
  estimatedDuration: number | null
  timeDifference: number | null
  notes: string | null
  deletedAt: string | null
}

interface ActivitySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimeSpent(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  
  return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
}

const DEFAULT_DAY_START_HOUR = 6 // 6 AM

function formatTimeDiff(diff: number): { text: string; color: string; icon: typeof TrendingUp } {
  const absDiff = Math.abs(diff)
  const label = formatTimeSpent(absDiff)

  if (diff > 0) {
    return { text: `Saved ${label}`, color: 'text-green-600 dark:text-green-400', icon: TrendingDown }
  } else if (diff < 0) {
    return { text: `${label} over`, color: 'text-orange-600 dark:text-orange-400', icon: TrendingUp }
  }
  return { text: 'On time', color: 'text-muted-foreground', icon: Minus }
}

// Get the "logical day start" for a given date, adjusting for custom day boundary
function getLogicalDayStart(date: Date, dayStartHour: number): Date {
  const calendarDay = startOfDay(date)
  const dayBoundary = addHours(calendarDay, dayStartHour)
  // If the time is before the day boundary, it belongs to the previous logical day
  if (date < dayBoundary) {
    return addHours(subHours(calendarDay, 24), dayStartHour)
  }
  return dayBoundary
}

// Check if a date falls within "today" based on custom day boundary
function isLogicalToday(date: Date, dayStartHour: number): boolean {
  const now = new Date()
  const logicalTodayStart = getLogicalDayStart(now, dayStartHour)
  const logicalRecordDay = getLogicalDayStart(date, dayStartHour)
  return isSameDay(logicalTodayStart, logicalRecordDay)
}

// Check if a date falls within "yesterday" based on custom day boundary
function isLogicalYesterday(date: Date, dayStartHour: number): boolean {
  const now = new Date()
  const logicalTodayStart = getLogicalDayStart(now, dayStartHour)
  const logicalYesterdayStart = subHours(logicalTodayStart, 24)
  const logicalRecordDay = getLogicalDayStart(date, dayStartHour)
  return isSameDay(logicalYesterdayStart, logicalRecordDay)
}

function getDayLabel(dateStr: string, dayStartHour: number): string {
  const date = parseISO(dateStr)
  if (isLogicalToday(date, dayStartHour)) return 'Today'
  if (isLogicalYesterday(date, dayStartHour)) return 'Yesterday'
  // Use the logical day start for formatting
  const logicalDay = getLogicalDayStart(date, dayStartHour)
  return format(logicalDay, 'EEEE, MMM d')
}

function TaskCard({ 
  record, 
  deleteMode, 
  selected, 
  onToggleSelect,
  onEdit,
}: { 
  record: CompletedTaskRecord
  deleteMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onEdit?: (record: CompletedTaskRecord) => void
}) {
  const timeSpent = record.actualTimeSpent || 0
  const diff = record.timeDifference
  const diffInfo = diff != null ? formatTimeDiff(diff) : null
  const DiffIcon = diffInfo?.icon

  return (
    <div 
      className={`p-4 rounded-lg border bg-card transition-colors hover:bg-accent/50 ${selected ? 'ring-2 ring-primary' : ''} ${!deleteMode && onEdit ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (!deleteMode && onEdit) onEdit(record)
      }}
    >
      <div className="flex items-start gap-3">
        {deleteMode && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.(record.id)}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{record.taskTitle}</h4>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: record.categoryColor,
                color: record.categoryColor,
              }}
            >
              {record.categoryName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {record.taskType}
            </Badge>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(parseISO(record.completedAt), 'h:mm a')}</span>
            </div>
            {diffInfo && DiffIcon && (
              <div className={`flex items-center gap-1 text-xs font-medium ${diffInfo.color}`}>
                <DiffIcon className="h-3.5 w-3.5" />
                <span>{diffInfo.text}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {timeSpent > 0 && (
            <div className="flex items-center gap-1.5 text-lg font-semibold text-primary">
              <Clock className="h-4 w-4" />
              {formatTimeSpent(timeSpent)}
            </div>
          )}
          {record.estimatedDuration && (
            <div className="text-xs text-muted-foreground mt-1">
              Est: {formatTimeSpent(record.estimatedDuration)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsRow({ records }: { records: CompletedTaskRecord[] }) {
  const totalTimeSpent = records.reduce(
    (sum, r) => sum + (r.actualTimeSpent || 0),
    0
  )
  const totalTimeSaved = records.reduce(
    (sum, r) => sum + (r.timeDifference && r.timeDifference > 0 ? r.timeDifference : 0),
    0
  )

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
      <div>
        <div className="text-sm text-muted-foreground">Completed</div>
        <div className="text-2xl font-bold">{records.length}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Total Study Time</div>
        <div className="text-2xl font-bold">{formatTimeSpent(totalTimeSpent)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Time Saved</div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {totalTimeSaved > 0 ? formatTimeSpent(totalTimeSaved) : '—'}
        </div>
      </div>
    </div>
  )
}

export function ActivitySummaryDialog({
  open,
  onOpenChange,
}: ActivitySummaryDialogProps) {
  const [records, setRecords] = useState<CompletedTaskRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'today' | 'all'>('today')
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingRecord, setEditingRecord] = useState<CompletedTaskRecord | null>(null)
  const [editForm, setEditForm] = useState({
    taskTitle: '',
    actualTimeSpent: '',
    estimatedDuration: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [dayStartHour, setDayStartHour] = useState(DEFAULT_DAY_START_HOUR)

  // Load day boundary settings from localStorage (synced with time-records)
  useEffect(() => {
    const saved = localStorage.getItem('timeRecords-dayBoundaries')
    if (saved) {
      try {
        const { start } = JSON.parse(saved)
        if (typeof start === 'number') setDayStartHour(start)
      } catch {}
    }
  }, [])

  const loadRecords = () => {
    setLoading(true)
    fetch('/api/completed-tasks')
      .then((res) => res.json())
      .then((data) => setRecords(data))
      .catch((err) => console.error('Failed to load completed tasks:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) {
      setTab('today')
      setDeleteMode(false)
      setSelectedIds(new Set())
      setEditingRecord(null)
      loadRecords()
    }
  }, [open])

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds)
    if (idsToDelete.length === 0) return

    try {
      await Promise.all(
        idsToDelete.map((id) =>
          fetch(`/api/completed-tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleted: true }),
          })
        )
      )
      setSelectedIds(new Set())
      loadRecords()
    } catch (error) {
      console.error('Failed to delete tasks:', error)
    }
  }

  const handleStartEdit = (record: CompletedTaskRecord) => {
    if (deleteMode) return
    setEditingRecord(record)
    setEditForm({
      taskTitle: record.taskTitle,
      actualTimeSpent: record.actualTimeSpent != null ? String(record.actualTimeSpent) : '',
      estimatedDuration: record.estimatedDuration != null ? String(record.estimatedDuration) : '',
      notes: record.notes ?? '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return
    setSaving(true)
    try {
      const actualTimeSpent = editForm.actualTimeSpent !== '' ? Number(editForm.actualTimeSpent) : null
      const estimatedDuration = editForm.estimatedDuration !== '' ? Number(editForm.estimatedDuration) : null

      await fetch(`/api/completed-tasks/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: editForm.taskTitle,
          actualTimeSpent,
          estimatedDuration,
          notes: editForm.notes || null,
        }),
      })
      setEditingRecord(null)
      loadRecords()
    } catch (error) {
      console.error('Failed to save edit:', error)
    } finally {
      setSaving(false)
    }
  }

  // Filter for today using custom day boundary
  const todayRecords = useMemo(
    () => records.filter((r) => isLogicalToday(parseISO(r.completedAt), dayStartHour)),
    [records, dayStartHour]
  )

  // Group all records by day (descending) using custom day boundary
  const groupedByDay = useMemo(() => {
    const groups: { label: string; date: Date; records: CompletedTaskRecord[] }[] = []
    const map = new Map<string, CompletedTaskRecord[]>()

    for (const r of records) {
      const logicalDay = getLogicalDayStart(parseISO(r.completedAt), dayStartHour)
      const dayKey = logicalDay.toISOString()
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push(r)
    }

    for (const [dayKey, dayRecords] of map) {
      groups.push({
        label: getDayLabel(dayRecords[0].completedAt, dayStartHour),
        date: new Date(dayKey),
        records: dayRecords,
      })
    }

    return groups.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [records, dayStartHour])

  const activeRecords = tab === 'today' ? todayRecords : records

  // ── Edit inline panel ──
  if (editingRecord) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Completed Task
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingRecord(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Update the details of this completed task record
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Task info summary */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: editingRecord.categoryColor,
                  color: editingRecord.categoryColor,
                }}
              >
                {editingRecord.categoryName}
              </Badge>
              <span>&middot;</span>
              <Badge variant="secondary" className="text-xs">{editingRecord.taskType}</Badge>
              <span>&middot;</span>
              <span className="text-xs">
                Completed {format(parseISO(editingRecord.completedAt), 'MMM d, h:mm a')}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-medium">Task Title</Label>
              <Input
                id="edit-title"
                value={editForm.taskTitle}
                onChange={(e) => setEditForm({ ...editForm, taskTitle: e.target.value })}
              />
            </div>

            {/* Time fields side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-actual" className="text-sm font-medium">
                  Actual Time (minutes)
                </Label>
                <Input
                  id="edit-actual"
                  type="number"
                  min="0"
                  placeholder="e.g. 45"
                  value={editForm.actualTimeSpent}
                  onChange={(e) => setEditForm({ ...editForm, actualTimeSpent: e.target.value })}
                />
                {editForm.actualTimeSpent && Number(editForm.actualTimeSpent) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {formatTimeSpent(Number(editForm.actualTimeSpent))}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-est" className="text-sm font-medium">
                  Estimated Duration (minutes)
                </Label>
                <Input
                  id="edit-est"
                  type="number"
                  min="0"
                  placeholder="e.g. 60"
                  value={editForm.estimatedDuration}
                  onChange={(e) => setEditForm({ ...editForm, estimatedDuration: e.target.value })}
                />
                {editForm.estimatedDuration && Number(editForm.estimatedDuration) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {formatTimeSpent(Number(editForm.estimatedDuration))}
                  </p>
                )}
              </div>
            </div>

            {/* Time difference preview */}
            {editForm.actualTimeSpent && editForm.estimatedDuration && (
              <div className="p-3 bg-muted/50 rounded-lg">
                {(() => {
                  const diff = Number(editForm.estimatedDuration) - Number(editForm.actualTimeSpent)
                  const info = formatTimeDiff(diff)
                  const Icon = info.icon
                  return (
                    <div className={`flex items-center gap-2 text-sm font-medium ${info.color}`}>
                      <Icon className="h-4 w-4" />
                      <span>{info.text}</span>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
              <Input
                id="edit-notes"
                placeholder="Optional notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingRecord(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.taskTitle.trim()}
              >
                <Check className="h-4 w-4 mr-1.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Summary
            </DialogTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDeleteMode(!deleteMode)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMode ? 'Exit Delete Mode' : 'Delete Tasks'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogDescription>
            {deleteMode 
              ? 'Select tasks to delete. Deleted tasks can be restored within 3 days.'
              : 'Click on a task to edit its details'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Delete mode actions */}
          {deleteMode && (
            <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDeleteMode(false); setSelectedIds(new Set()) }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Today / All Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'today' | 'all')}>
            <TabsList className="w-full">
              <TabsTrigger value="today" className="flex-1 gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Today
                {todayRecords.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {todayRecords.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 gap-1.5">
                <History className="h-3.5 w-3.5" />
                All
                {records.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {records.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Stats for active view */}
          {!deleteMode && <StatsRow records={activeRecords} />}

          {/* Task List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : activeRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  {tab === 'today'
                    ? 'No tasks completed today yet.'
                    : 'No completed tasks recorded yet.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start the timer on tasks in Today&apos;s Plan to track your study time.
                </p>
              </div>
            ) : tab === 'today' ? (
              /* Today — flat list */
              <div className="space-y-3">
                {todayRecords.map((record) => (
                  <TaskCard 
                    key={record.id} 
                    record={record}
                    deleteMode={deleteMode}
                    selected={selectedIds.has(record.id)}
                    onToggleSelect={handleToggleSelect}
                    onEdit={handleStartEdit}
                  />
                ))}
              </div>
            ) : (
              /* All — grouped by day */
              <div className="space-y-6">
                {groupedByDay.map((group) => (
                  <div key={group.date.toISOString()}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        {group.label}
                      </h3>
                      <span className="text-xs text-muted-foreground/60">
                        {group.records.length} task{group.records.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.records.map((record) => (
                        <TaskCard 
                          key={record.id} 
                          record={record}
                          deleteMode={deleteMode}
                          selected={selectedIds.has(record.id)}
                          onToggleSelect={handleToggleSelect}
                          onEdit={handleStartEdit}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

