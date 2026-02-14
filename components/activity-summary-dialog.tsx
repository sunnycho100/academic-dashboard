'use client'

import { Task, Category } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Calendar } from 'lucide-react'
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'

interface ActivitySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  categories: Category[]
}

function formatTimeSpent(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function getRelativeDate(dateString: string): string {
  const date = parseISO(dateString)
  
  if (isToday(date)) {
    return 'Today'
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  if (isThisWeek(date, { weekStartsOn: 0 })) {
    return format(date, 'EEEE') // Day name
  }
  return format(date, 'MMM d, yyyy')
}

export function ActivitySummaryDialog({
  open,
  onOpenChange,
  tasks,
  categories,
}: ActivitySummaryDialogProps) {
  const completedTasks = tasks.filter((task) => task.status === 'done')
  
  const totalTimeSpent = completedTasks.reduce(
    (sum, task) => sum + (task.actualTimeSpent || 0),
    0
  )
  
  const tasksWithTime = completedTasks.filter((task) => task.actualTimeSpent && task.actualTimeSpent > 0)

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
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Total Completed</div>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Study Time</div>
              <div className="text-2xl font-bold">{formatTimeSpent(totalTimeSpent)}</div>
            </div>
          </div>

          {/* Task List */}
          <ScrollArea className="h-[400px] pr-4">
            {tasksWithTime.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  No completed tasks with recorded time yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start the timer on tasks in Today's Plan to track your study time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksWithTime.map((task) => {
                  const category = categories.find((c) => c.id === task.categoryId)
                  const timeSpent = task.actualTimeSpent || 0

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{task.title}</h4>
                            {category && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: category.color,
                                  color: category.color,
                                }}
                              >
                                {category.name}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-xs">
                                {task.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{getRelativeDate(task.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1.5 text-lg font-semibold text-primary">
                            <Clock className="h-4 w-4" />
                            {formatTimeSpent(timeSpent)}
                          </div>
                          {task.estimatedDuration && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Est: {task.estimatedDuration}m
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
