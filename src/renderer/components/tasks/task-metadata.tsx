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
  return (
    <div className="flex items-center gap-1.5">
      {/* The course color lives on the ring; the name stays plain */}
      <span className="text-xs text-muted-foreground max-w-[7.5rem] truncate flex-shrink-0">{category.name}</span>
      <span className="text-muted-foreground/40 text-xs flex-shrink-0">·</span>
      <span className="text-xs text-muted-foreground truncate flex-shrink-0">{task.type}</span>
      <span className="text-muted-foreground/40 text-xs flex-shrink-0">·</span>
      <span className="text-xs text-muted-foreground flex-shrink-0">
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
      {/* Weekly day labels */}
      {weeklyDayLabels && weeklyDayLabels.length > 0 && (
        <>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="inline-flex items-center gap-1">
            {weeklyDayLabels.map((day) => (
              <Badge
                key={day}
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 font-medium text-today dark:text-today border-today/40 bg-today/10"
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
