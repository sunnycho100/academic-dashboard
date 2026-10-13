import type { Task, Category } from '@/lib/types'
import type { TodaySession } from '@/hooks/use-today-session'
import { GripVertical, Play, Pause, ChevronLeft, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InlineEdit } from '@/components/tasks/inline-edit'
import { InlineDurationEdit } from '@/components/tasks/inline-duration-edit'
import { cn } from '@/lib/utils'
import { CourseRing } from '@/components/tasks/course-ring'
import { SortableTodayItem } from '@/components/today/sortable-today-item'
import { dueLabel } from '@/lib/task-format'

interface TodayTaskRowProps {
  task: Task
  category?: Category
  session: TodaySession
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onRemoveFromToday: (id: string) => void
  onEdit: (task: Task) => void
  onSave: (task: Task) => void
  onDuplicate: (task: Task) => void
  onDelete: (id: string) => void
  drawIndex?: number | null
}

/** A task in the Today group: sortable within Today, with its own timer controls. */
export function TodayTaskRow({ task, category, session, onToggleTask, onRemoveFromToday, onEdit, onSave, onDuplicate, onDelete, drawIndex = null }: TodayTaskRowProps) {
  const { timerStates, getElapsedSeconds, formatTime, startTimer, pauseTimer, resumeTimer, stopTimer } = session
  const state = timerStates[task.id]
  const hasStarted = !!state?.isRunning
  const isRunning = hasStarted && !state?.isPaused
  const isPaused = hasStarted && !!state?.isPaused
  const due = dueLabel(task.dueAt)

  const complete = () => {
    const elapsed = getElapsedSeconds(task.id)
    if (hasStarted) stopTimer(task.id)
    onToggleTask(task.id, elapsed)
  }

  return (
    <SortableTodayItem id={`today-${task.id}`}>
      {(listeners, attributes) => (
        <div
          className={cn(
            'group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors',
            isRunning ? 'border-coral/60' : 'border-border hover:border-foreground/20',
            task.status === 'done' && 'opacity-50',
          )}
        >
          <button
            {...listeners}
            {...attributes}
            className="flex-shrink-0 -ml-1 h-8 w-4 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CourseRing
            color={category?.color ?? '#888'}
            checked={task.status === 'done'}
            onToggle={complete}
            drawIndex={drawIndex}
            label={`Complete ${task.title}`}
          />
          <div className="flex-1 min-w-0">
            {task.status === 'done' ? (
              <p className="text-sm leading-snug truncate line-through text-muted-foreground">{task.title}</p>
            ) : (
              <InlineEdit value={task.title} onSave={(title) => onSave({ ...task, title })} className="block w-fit max-w-full text-sm leading-snug truncate" />
            )}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {category?.name ?? 'Unknown'} · {task.type}
            </p>
          </div>
          {hasStarted ? (
            <span
              className={cn(
                'text-xs tabular-nums',
                isRunning ? 'text-coral' : 'text-muted-foreground',
              )}
            >
              {isRunning ? 'running ' : 'paused '}
              {formatTime(getElapsedSeconds(task.id))}
            </span>
          ) : (
            <span className="text-xs tabular-nums text-muted-foreground">
              <InlineDurationEdit minutes={task.estimatedDuration} onSave={(estimatedDuration) => onSave({ ...task, estimatedDuration })} />
            </span>
          )}
          {due && (
            <span
              className={cn(
                'text-xs whitespace-nowrap tabular-nums',
                due.late ? 'text-coral' : due.text === 'Today' ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {due.text}
            </span>
          )}
          <button
            onClick={() => (isRunning ? pauseTimer(task.id) : isPaused ? resumeTimer(task.id) : startTimer(task.id))}
            className={cn(
              'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors',
              isRunning ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground',
            )}
            title={isRunning ? 'Pause timer' : isPaused ? 'Resume timer' : 'Start timer'}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>
          <button
            onClick={() => {
              if (hasStarted) stopTimer(task.id)
              onRemoveFromToday(task.id)
            }}
            className="flex-shrink-0 h-8 w-6 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
            title="Return to backlog"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-shrink-0 -ml-2 h-8 w-6 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 hover:text-foreground transition-opacity"
                aria-label={`More actions for ${task.title}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(task)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (hasStarted) stopTimer(task.id) // save the running time before the task goes
                  onDelete(task.id)
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </SortableTodayItem>
  )
}
