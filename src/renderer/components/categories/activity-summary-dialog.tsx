import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

function formatTimeDiff(diff: number): { text: string; color: string } {
  const absDiff = Math.abs(diff)
  const label = formatTimeSpent(absDiff)

  if (diff > 0) {
    return { text: `Saved ${label}`, color: 'text-muted-foreground' }
  } else if (diff < 0) {
    return { text: `${label} over`, color: 'text-foreground' }
  }
  return { text: 'On time', color: 'text-muted-foreground' }
}

const sectionLabel = 'text-xs uppercase tracking-wider text-muted-foreground'
// A hairline focus ring; the global two-pixel offset ring is too heavy inside the dialog
const field = 'mt-2 focus-visible:ring-1 focus-visible:ring-offset-0'

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

  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 ${selected ? 'border-foreground' : 'border-border'} ${!deleteMode && onEdit ? 'cursor-pointer' : ''}`}
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
        <div className="flex-1 space-y-1">
          <h4 className="font-medium">{record.taskTitle}</h4>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: record.categoryColor }} />
              {record.categoryName}
            </span>
            <span>&middot;</span>
            <span>{record.taskType}</span>
            <span>&middot;</span>
            <span className="tabular-nums">{format(parseISO(record.completedAt), 'h:mm a')}</span>
            {diffInfo && (
              <>
                <span>&middot;</span>
                <span className={diffInfo.color}>{diffInfo.text}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right tabular-nums">
          {timeSpent > 0 && <div className="text-base">{formatTimeSpent(timeSpent)}</div>}
          {record.estimatedDuration && (
            <div className="mt-1 text-xs text-muted-foreground">
              Est. {formatTimeSpent(record.estimatedDuration)}
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
    <div className="grid grid-cols-3 gap-4 border-y border-border py-4">
      <div>
        <div className={sectionLabel}>Completed</div>
        <div className="mt-1 font-serif text-2xl tabular-nums">{records.length}</div>
      </div>
      <div>
        <div className={sectionLabel}>Study time</div>
        <div className="mt-1 font-serif text-2xl tabular-nums">{formatTimeSpent(totalTimeSpent)}</div>
      </div>
      <div>
        <div className={sectionLabel}>Time saved</div>
        <div className="mt-1 font-serif text-2xl tabular-nums">
          {formatTimeSpent(totalTimeSaved)}
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
        <DialogContent className="max-w-2xl gap-0 p-0" aria-describedby={undefined}>
          <div className="px-6 pt-6">
            <DialogTitle className="font-serif text-2xl font-normal">Edit completed task</DialogTitle>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: editingRecord.categoryColor }} />
                {editingRecord.categoryName}
              </span>
              <span>&middot;</span>
              <span>{editingRecord.taskType}</span>
              <span>&middot;</span>
              <span>Completed {format(parseISO(editingRecord.completedAt), 'MMM d, h:mm a')}</span>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="edit-title" className={sectionLabel}>Title</label>
              <Input
                id="edit-title"
                value={editForm.taskTitle}
                onChange={(e) => setEditForm({ ...editForm, taskTitle: e.target.value })}
                className={field}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-actual" className={sectionLabel}>Actual (min)</label>
                <Input
                  id="edit-actual"
                  type="number"
                  min="0"
                  value={editForm.actualTimeSpent}
                  onChange={(e) => setEditForm({ ...editForm, actualTimeSpent: e.target.value })}
                  className={`${field} tabular-nums`}
                />
                {editForm.actualTimeSpent && Number(editForm.actualTimeSpent) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    = {formatTimeSpent(Number(editForm.actualTimeSpent))}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="edit-est" className={sectionLabel}>Estimate (min)</label>
                <Input
                  id="edit-est"
                  type="number"
                  min="0"
                  value={editForm.estimatedDuration}
                  onChange={(e) => setEditForm({ ...editForm, estimatedDuration: e.target.value })}
                  className={`${field} tabular-nums`}
                />
                {editForm.estimatedDuration && Number(editForm.estimatedDuration) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    = {formatTimeSpent(Number(editForm.estimatedDuration))}
                  </p>
                )}
              </div>
            </div>

            {editForm.actualTimeSpent && editForm.estimatedDuration && (() => {
              const info = formatTimeDiff(Number(editForm.estimatedDuration) - Number(editForm.actualTimeSpent))
              return <p className={`text-sm ${info.color}`}>{info.text}</p>
            })()}

            <div>
              <label htmlFor="edit-notes" className={sectionLabel}>Notes</label>
              <Input
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className={field}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => setEditingRecord(null)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editForm.taskTitle.trim()}
              className="rounded-full px-5"
            >
              {saving ? 'Saving' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0" aria-describedby={undefined}>
        <div className="flex items-center justify-between gap-2 px-6 pr-14 pt-6">
          <DialogTitle className="font-serif text-2xl font-normal">Activity summary</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDeleteMode(!deleteMode)}>
                {deleteMode ? 'Stop deleting' : 'Delete tasks'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4 px-6 py-5">
          {deleteMode && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} selected. Deleted tasks can be restored within 3 days.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => { setDeleteMode(false); setSelectedIds(new Set()) }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'today' | 'all')}>
            <TabsList className="w-full">
              <TabsTrigger value="today" className="flex-1 gap-1.5">
                Today
                {todayRecords.length > 0 && (
                  <span className="tabular-nums text-muted-foreground">{todayRecords.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 gap-1.5">
                All
                {records.length > 0 && (
                  <span className="tabular-nums text-muted-foreground">{records.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!deleteMode && <StatsRow records={activeRecords} />}

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading</p>
              </div>
            ) : activeRecords.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">
                  {tab === 'today' ? 'Nothing completed today.' : 'No completed tasks yet.'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start the timer on a task in Today&apos;s plan to track study time.
                </p>
              </div>
            ) : tab === 'today' ? (
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
              <div className="space-y-6">
                {groupedByDay.map((group) => (
                  <div key={group.date.toISOString()}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <h3 className={sectionLabel}>{group.label}</h3>
                      <span className="text-xs tabular-nums text-muted-foreground">
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
