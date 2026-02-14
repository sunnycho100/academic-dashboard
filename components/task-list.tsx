'use client'

import { Task, Category, SortOption } from '@/lib/types'
import { TaskRow } from './task-row'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FileQuestion } from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

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
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
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
      </motion.div>
    )
  }

  const getCategoryForTask = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)!
  }

  if (groupByCategory) {
    const tasksByCategory = categories.map((category) => ({
      category,
      tasks: tasks.filter((t) => t.categoryId === category.id),
    }))

    return (
      <LayoutGroup>
        <div className="space-y-8">
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
                        {categoryTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            category={category}
                            onToggle={onToggleTask}
                            onEdit={onEditTask}
                            onSave={onSaveTask}
                            onDuplicate={onDuplicateTask}
                            onDelete={onDeleteTask}
                            onAddToToday={onAddToToday}
                            onRemoveFromToday={onRemoveFromToday}
                            isInToday={todayTaskIds?.includes(task.id)}
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
  }

  const isDraggable = sortOption === 'manual'

  return (
    <LayoutGroup>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
        disabled={!isDraggable}
      >
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                category={getCategoryForTask(task.categoryId)}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onSave={onSaveTask}
                onDuplicate={onDuplicateTask}
                onDelete={onDeleteTask}
                onAddToToday={onAddToToday}
                onRemoveFromToday={onRemoveFromToday}
                isInToday={todayTaskIds?.includes(task.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      </SortableContext>
    </LayoutGroup>
  )
}
