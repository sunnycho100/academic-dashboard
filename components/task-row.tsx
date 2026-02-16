'use client'

import { useState, useRef, useEffect } from 'react'
import { Task, Category, TaskType } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GripVertical, MoreVertical, Pencil, Copy, Trash2, StickyNote, ChevronRight, ChevronLeft, Target, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'

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

function InlineEdit({
  value,
  onSave,
  className,
  type = 'text',
}: {
  value: string
  onSave: (val: string) => void
  className?: string
  type?: 'text' | 'date'
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      if (type === 'text') inputRef.current?.select()
    }
  }, [editing, type])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const commit = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim())
    } else {
      setEditValue(value)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setEditValue(value)
            setEditing(false)
          }
        }}
        className={cn('h-7 px-1.5 py-0 w-auto min-w-0 border-border/50 bg-background', className)}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn('cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors', className)}
      title="Click to edit"
    >
      {type === 'date' && value ? new Date(value + 'T00:00:00').toLocaleDateString() : value}
    </span>
  )
}

function InlineDurationEdit({
  minutes,
  onSave,
}: {
  minutes: number | undefined
  onSave: (val: number | undefined) => void
}) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(minutes ? String(Math.floor(minutes / 60)) : '0')
  const [mins, setMins] = useState(minutes ? String(minutes % 60) : '0')
  const hoursRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
    setMins(minutes ? String(minutes % 60) : '0')
  }, [minutes])

  useEffect(() => {
    if (editing) hoursRef.current?.focus()
  }, [editing])

  const commit = () => {
    const h = parseInt(hours || '0')
    const m = parseInt(mins || '0')
    const total = h * 60 + m
    onSave(total > 0 ? total : undefined)
    setEditing(false)
  }

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${mins}m`
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Input
          ref={hoursRef}
          type="number"
          min="0"
          max="99"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
              setMins(minutes ? String(minutes % 60) : '0')
              setEditing(false)
            }
          }}
          className="h-7 text-xs px-1 py-0 w-10 border-border/50 bg-background"
        />
        <span className="text-[10px] text-muted-foreground">h</span>
        <Input
          type="number"
          min="0"
          max="59"
          value={mins}
          onChange={(e) => setMins(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
              setMins(minutes ? String(minutes % 60) : '0')
              setEditing(false)
            }
          }}
          className="h-7 text-xs px-1 py-0 w-10 border-border/50 bg-background"
        />
        <span className="text-[10px] text-muted-foreground">m</span>
      </span>
    )
  }

  if (!minutes) {
    return (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors text-muted-foreground/40 italic"
        title="Click to set duration"
      >
        + time
      </span>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors"
      title="Click to edit duration"
    >
      {formatDuration(minutes)}
    </span>
  )
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

  const dueDate = task.dueAt ? new Date(task.dueAt) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let daysDiff: number | null = null
  let dueDateLabel = ''
  let dueDateVariant: 'default' | 'secondary' | 'destructive' | 'outline' =
    'secondary'

  if (dueDate) {
    const dueDateOnly = new Date(dueDate)
    dueDateOnly.setHours(0, 0, 0, 0)

    daysDiff = Math.floor(
      (dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff < 0) {
      const daysOverdue = Math.abs(daysDiff)
      dueDateLabel = `Overdue ${daysOverdue}d`
      dueDateVariant = 'destructive'
    } else if (daysDiff === 0) {
      dueDateLabel = 'Due today'
      dueDateVariant = 'destructive'
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

  const isOverdue = dueDate !== null && daysDiff !== null && daysDiff < 0 && task.status !== 'done'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card transition-all duration-200',
        'hover:shadow-md hover:border-border',
        isDragging && 'opacity-50 shadow-lg scale-[1.02] z-50',
        task.status === 'done' && 'opacity-50'
      )}
    >
      {/* Category left accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity duration-200 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: category.color }}
      />

      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </button>

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
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: category.color }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </div>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground/70">{task.type}</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground/70">
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
          <span className="text-muted-foreground/40 text-xs">·</span>
          <Badge
            variant={dueDateVariant}
            className="text-xs font-normal"
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
                  const diff = task.estimatedDuration - task.actualTimeSpent
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
