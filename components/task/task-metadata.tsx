'use client'

import { Task, Category } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { InlineDurationEdit } from './inline-duration-edit'

export interface TaskMetadataProps {
  task: Task
  category: Category
  onSave?: (task: Task) => void
  weeklyDayLabels?: string[]
}

export function TaskMetadata({ task, category, onSave, weeklyDayLabels }: TaskMetadataProps) {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let dueDateLabel = ''
  let dueDateVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary'
  let dueDateClassName = ''

  if (dueDate) {
    const dueDateOnly = new Date(dueDate)
    dueDateOnly.setHours(0, 0, 0, 0)

    const daysDiff = Math.floor(
      (dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff < 0) {
      const daysOverdue = Math.abs(daysDiff)
      dueDateLabel = `Overdue ${daysOverdue}d`
      dueDateVariant = 'destructive'
    } else if (daysDiff === 0) {
      dueDateLabel = 'Due today'
      dueDateVariant = 'default'
      dueDateClassName = 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/40 hover:bg-red-500/30 font-medium'
    } else if (daysDiff === 1) {
      dueDateLabel = 'Due tomorrow'
      dueDateVariant = 'default'
    } else {
      dueDateLabel = `Due in ${daysDiff}d`
      dueDateVariant = 'secondary'
    }
  } else {
    dueDateLabel = 'No due date'
    dueDateVariant = 'outline'
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center gap-1.5 text-xs w-[68px] truncate flex-shrink-0"
        style={{ color: category.color }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="truncate">{category.name}</span>
      </div>
      <span className="text-muted-foreground/40 text-xs flex-shrink-0">·</span>
      <span className="text-xs text-muted-foreground/70 w-[68px] truncate flex-shrink-0">{task.type}</span>
      <span className="text-muted-foreground/40 text-xs flex-shrink-0">·</span>
      <span className="text-xs text-muted-foreground/70 w-[44px] flex-shrink-0">
        {onSave ? (
          <InlineDurationEdit
            minutes={task.estimatedDuration}
            onSave={(val) => onSave({ ...task, estimatedDuration: val })}
          />
        ) : (
          task.estimatedDuration
            ? (task.estimatedDuration >= 60
              ? `${Math.floor(task.estimatedDuration / 60)}h ${task.estimatedDuration % 60 > 0 ? `${task.estimatedDuration % 60}m` : ''}`
              : `${task.estimatedDuration}m`)
            : null
        )}
      </span>
      <span className="text-muted-foreground/40 text-xs flex-shrink-0">·</span>
      <Badge
        variant={dueDateVariant}
        className={cn('text-xs font-normal flex-shrink-0', dueDateClassName)}
      >
        {dueDateLabel}
      </Badge>
      {/* Weekly day labels */}
      {weeklyDayLabels && weeklyDayLabels.length > 0 && (
        <>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="inline-flex items-center gap-1">
            {weeklyDayLabels.map((day) => (
              <Badge
                key={day}
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 font-medium text-violet-600 dark:text-violet-400 border-violet-400/40 bg-violet-500/10"
              >
                {day}
              </Badge>
            ))}
          </span>
        </>
      )}
      {/* Completed time info */}
      {task.status === 'done' && task.actualTimeSpent != null && task.actualTimeSpent > 0 && (
        <>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
            <Clock className="h-3 w-3" />
            {task.actualTimeSpent >= 60
              ? `${Math.floor(task.actualTimeSpent / 60)}h ${task.actualTimeSpent % 60 > 0 ? `${task.actualTimeSpent % 60}m` : ''}`
              : `${task.actualTimeSpent}m`}
          </span>
          {task.estimatedDuration != null && (
            (() => {
              const diff = task.estimatedDuration - task.actualTimeSpent!
              if (diff === 0) return null
              const absDiff = Math.abs(diff)
              const label = absDiff >= 60
                ? `${Math.floor(absDiff / 60)}h ${absDiff % 60 > 0 ? `${absDiff % 60}m` : ''}`
                : `${absDiff}m`
              return (
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                )}>
                  {diff > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {diff > 0 ? `Saved ${label}` : `${label} over`}
                </span>
              )
            })()
          )}
        </>
      )}
    </div>
  )
}
