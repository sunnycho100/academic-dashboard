'use client'

import { Task, Category } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
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
import { GripVertical, MoreVertical, Pencil, Copy, Trash2, StickyNote, ChevronRight, ChevronLeft, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { childSpring } from '@/lib/liquidTransitions'
import { InlineEdit } from '@/components/task/inline-edit'
import { TaskMetadata } from '@/components/task/task-metadata'

interface TaskRowProps {
  task: Task
  category: Category
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDuplicate: (task: Task) => void
  onDelete: (id: string) => void
  onSave?: (task: Task) => void
  onAddToToday?: (id: string) => void
  onRemoveFromToday?: (id: string) => void
  isInToday?: boolean
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
  onRemoveFromToday,
  isInToday,
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
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-xl glass-thin glass-interactive glass-hover-glow cursor-grab active:cursor-grabbing touch-none',
        'hover:shadow-lg',
        isDragging && 'opacity-60 shadow-xl scale-[1.02] z-50 ring-2 ring-primary/20',
        task.status === 'done' && 'opacity-50'
      )}
    >
      {/* Category left accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:shadow-sm"
        style={{
          backgroundColor: category.color,
          boxShadow: `0 0 6px ${category.color}40`,
        }}
      />

      <div className="flex-shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>

      <motion.div
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => onToggle(task.id)}
          className="flex-shrink-0"
        />
      </motion.div>

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
      {onAddToToday && !isInToday && (
        <motion.button
          whileHover={{ scale: 1.15, x: 2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onAddToToday(task.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground/50 hover:text-primary"
          title="Add to Today's Plan"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      )}
      {onRemoveFromToday && isInToday && (
        <motion.button
          whileHover={{ scale: 1.15, x: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onRemoveFromToday(task.id)}
          className="group/today flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10 hover:bg-muted/60 transition-all"
          title="Remove from Today's Plan"
        >
          <Target className="h-3 w-3 text-primary/60 group-hover/today:hidden" />
          <ChevronLeft className="h-4 w-4 text-muted-foreground/50 hidden group-hover/today:block" />
        </motion.button>
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
