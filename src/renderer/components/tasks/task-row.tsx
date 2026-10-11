import { Task, Category } from '@/lib/types'
import { CourseRing } from '@/components/tasks/course-ring'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { GripVertical, MoreVertical, Pencil, Copy, Trash2, StickyNote, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { childSpring } from '@/lib/liquidTransitions'
import { dueLabel, formatMinutes } from '@/lib/task-format'
import { InlineEdit } from '@/components/tasks/inline-edit'
import { InlineDurationEdit } from '@/components/tasks/inline-duration-edit'

interface TaskRowProps {
  task: Task
  category: Category
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDuplicate: (task: Task) => void
  onDelete: (id: string) => void
  onSave?: (task: Task) => void
  onAddToToday?: (id: string) => void
  /** Stagger slot for the ring draw-in; null when the ring is already drawn */
  drawIndex?: number | null
  isDragging?: boolean
  animationIndex?: number
  weeklyDayLabels?: string[]
}

export function TaskRow({
  task,
  category,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onSave,
  onAddToToday,
  drawIndex = null,
  animationIndex = 0,
  weeklyDayLabels,
}: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const due = dueLabel(task.dueAt)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', height: 0, marginTop: 0, marginBottom: 0, padding: 0, overflow: 'hidden', transition: { duration: 0.25, type: "spring", stiffness: 300, damping: 25 } }}
      transition={childSpring}
      whileTap={{ scale: 0.995 }}
      className={cn(
        // Ledger row: one line, hairline divider, columns that line up down the list
        'group relative flex items-center gap-3 border-b border-border px-2 py-2 cursor-grab active:cursor-grabbing touch-none hover:bg-secondary/40',
        isDragging && 'opacity-60 shadow-xl scale-[1.02] z-50 ring-2 ring-primary/20',
        task.status === 'done' && 'opacity-50'
      )}
    >

      <div className="flex-shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <CourseRing
        color={category.color}
        checked={task.status === 'done'}
        onToggle={() => onToggle(task.id)}
        drawIndex={drawIndex}
        label={`Complete ${task.title}`}
      />

      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        {onSave ? (
          <InlineEdit value={task.title} onSave={(val) => onSave({ ...task, title: val })} className="truncate text-sm" />
        ) : (
          <span className="truncate">{task.title}</span>
        )}
        {task.notes && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <StickyNote className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{task.notes}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {weeklyDayLabels && weeklyDayLabels.length > 0 && (
          <span className="flex-shrink-0 text-xs text-today">{weeklyDayLabels.join(' ')}</span>
        )}
      </div>
      <span className="w-24 flex-shrink-0 truncate text-xs text-muted-foreground" title={`${category.name} · ${task.type}`}>
        {category.name}
      </span>
      <span className="w-14 flex-shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
        {onSave ? (
          <InlineDurationEdit minutes={task.estimatedDuration} onSave={(val) => onSave({ ...task, estimatedDuration: val })} />
        ) : task.estimatedDuration ? (
          formatMinutes(task.estimatedDuration)
        ) : null}
      </span>
      <span
        className={cn(
          'w-16 flex-shrink-0 text-right text-xs tabular-nums',
          due && (due.late ? 'text-coral' : due.text === 'Today' ? 'font-medium text-foreground' : 'text-muted-foreground'),
        )}
      >
        {due?.text}
      </span>

      {/* Hover actions float over the row's right edge, so they take no column width */}
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center rounded-md bg-card opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {/* Toggle Today's Plan button */}
      {onAddToToday && (
        // Points up: the Today group sits above the rest of the list
        <button
          type="button"
          onClick={() => onAddToToday(task.id)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Add to Today's Plan"
          aria-label="Add to Today's Plan"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            aria-label={`More actions for ${task.title}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
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
            onClick={() => onDelete(task.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </motion.div>
  )
}
