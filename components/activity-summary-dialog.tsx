'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, parseISO } from 'date-fns'

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

export function ActivitySummaryDialog({
  open,
  onOpenChange,
}: ActivitySummaryDialogProps) {
  const [records, setRecords] = useState<CompletedTaskRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch('/api/completed-tasks')
        .then((res) => res.json())
        .then((data) => setRecords(data))
        .catch((err) => console.error('Failed to load completed tasks:', err))
        .finally(() => setLoading(false))
    }
  }, [open])

  const totalTimeSpent = records.reduce(
    (sum, r) => sum + (r.actualTimeSpent || 0),
    0
  )

  const totalTimeSaved = records.reduce(
    (sum, r) => sum + (r.timeDifference && r.timeDifference > 0 ? r.timeDifference : 0),
    0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Summary
          </DialogTitle>
          <DialogDescription>
            Your completed tasks and time spent on deep work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
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

          {/* Task List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  No completed tasks recorded yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start the timer on tasks in Today&apos;s Plan to track your study time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => {
                  const timeSpent = record.actualTimeSpent || 0
                  const diff = record.timeDifference
                  const diffInfo = diff != null ? formatTimeDiff(diff) : null
                  const DiffIcon = diffInfo?.icon

                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
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
                              <span>{format(parseISO(record.completedAt), 'MMM d, yyyy')}</span>
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
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

