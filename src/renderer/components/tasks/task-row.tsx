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
import { InlineEdit } from '@/components/tasks/inline-edit'
import { TaskMetadata } from '@/components/tasks/task-metadata'

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
        'group relative flex items-center gap-3 p-3 rounded-xl glass-thin glass-interactive cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-60 shadow-xl scale-[1.02] z-50 ring-2 ring-primary/20',
        task.status === 'done' && 'opacity-50'
      )}
    >

      <div className="flex-shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>

      <CourseRing
        color={category.color}
        checked={task.status === 'done'}
        onToggle={() => onToggle(task.id)}
        drawIndex={drawIndex}
        label={`Complete ${task.title}`}
      />

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'font-medium text-sm text-foreground mb-1 flex items-center gap-2 transition-all duration-300',
            task.status === 'done' && 'line-through text-muted-foreground'
          )}
        >
          {onSave ? (
            <InlineEdit
              value={task.title}
              onSave={(val) => onSave({ ...task, title: val })}
              className="font-medium text-sm"
            />
          ) : (
            task.title
          )}
          {task.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground/60" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{task.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <TaskMetadata
          task={task}
          category={category}
          onSave={onSave}
          weeklyDayLabels={weeklyDayLabels}
        />
      </div>

      {/* Toggle Today's Plan button */}
      {onAddToToday && (
        // Points up: the Today group sits above the rest of the list
        <button
          type="button"
          onClick={() => onAddToToday(task.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground"
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
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
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
    </motion.div>
  )
}
