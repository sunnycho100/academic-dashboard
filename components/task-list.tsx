'use client'

import { Task, Category, SortOption } from '@/lib/types'
import { TaskRow } from './task-row'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FileQuestion, ListTodo } from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TaskListProps {
  tasks: Task[]
  categories: Category[]
  groupByCategory: boolean
  onToggleTask: (id: string) => void
  onEditTask: (task: Task) => void
  onSaveTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddToToday?: (id: string) => void
  onRemoveFromToday?: (id: string) => void
  todayTaskIds?: string[]
  sortOption: SortOption
  emptyMessage: string
  weeklyDayLabels?: Record<string, string[]>
}

export function TaskList({
  tasks,
  categories,
  groupByCategory,
  onToggleTask,
  onEditTask,
  onSaveTask,
  onDuplicateTask,
  onDeleteTask,
  onAddToToday,
  onRemoveFromToday,
  todayTaskIds,
  sortOption,
  emptyMessage,
  weeklyDayLabels,
}: TaskListProps) {
  const getCategoryForTask = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)!
  }

  const isDraggable = sortOption === 'manual'
  const doneCount = tasks.filter((t) => t.status === 'done').length

  // ── Inner scrollable content ──
  let content: React.ReactNode

  if (tasks.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FileQuestion className="h-14 w-14 text-muted-foreground/40 mb-4" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-1 text-foreground">
          No tasks found
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">{emptyMessage}</p>
      </div>
    )
  } else if (groupByCategory) {
    const tasksByCategory = categories.map((category) => ({
      category,
      tasks: tasks.filter((t) => t.categoryId === category.id),
    }))

    content = (
      <LayoutGroup>
        <div className="space-y-6">
          {tasksByCategory.map(
            ({ category, tasks: categoryTasks }) =>
              categoryTasks.length > 0 && (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-semibold text-sm text-foreground tracking-wide">
                      {category.name}
                    </h3>
                    <span className="text-xs text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-full">
                      {categoryTasks.length}
                    </span>
                  </div>
                  <SortableContext
                    items={categoryTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-2">
                        {categoryTasks.map((task, index) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            category={category}
                            animationIndex={index}
                            onToggle={onToggleTask}
                            onEdit={onEditTask}
                            onSave={onSaveTask}
                            onDuplicate={onDuplicateTask}
                            onDelete={onDeleteTask}
                            onAddToToday={onAddToToday}
                            onRemoveFromToday={onRemoveFromToday}
                            isInToday={todayTaskIds?.includes(task.id)}
                            weeklyDayLabels={weeklyDayLabels?.[task.id]}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  </SortableContext>
                </motion.div>
              )
          )}
        </div>
      </LayoutGroup>
    )
  } else {
    content = (
      <LayoutGroup>
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          disabled={!isDraggable}
        >
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={getCategoryForTask(task.categoryId)}
                  animationIndex={index}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onSave={onSaveTask}
                  onDuplicate={onDuplicateTask}
                  onDelete={onDeleteTask}
                  onAddToToday={onAddToToday}
                  onRemoveFromToday={onRemoveFromToday}
                  isInToday={todayTaskIds?.includes(task.id)}
                  weeklyDayLabels={weeklyDayLabels?.[task.id]}
                />
              ))}
            </div>
          </AnimatePresence>
        </SortableContext>
      </LayoutGroup>
    )
  }

  // ── Card wrapper matching Today's Plan ──
  return (
    <motion.div
      layout
      className="relative rounded-2xl flex flex-col overflow-hidden bg-card/50 backdrop-blur-xl border border-border/40 shadow-sm h-full"
    >
      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ListTodo className="h-3.5 w-3.5 text-primary" />
            </motion.div>
            <h2 className="font-semibold text-sm tracking-tight">Tasks</h2>
          </div>
          {tasks.length > 0 && (
            <motion.span
              key={doneCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-[10px] font-medium text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full tabular-nums"
            >
              {doneCount}/{tasks.length}
            </motion.span>
          )}
        </div>
      </div>

      <div className="mx-4 border-t border-border/10" />

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-2">
          {content}
        </div>
      </ScrollArea>
    </motion.div>
  )
}
