'use client'

import { Category, TaskType } from '@/lib/types'
import { TaskFormSheet } from '@/components/task-form-sheet'

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onAdd: (task: {
    title: string
    categoryId: string
    type: TaskType
    dueAt: string | null
    notes?: string
    estimatedDuration?: number
    isOverdue?: boolean
  }) => void
}

export function AddTaskDialog({
  open,
  onOpenChange,
  categories,
  onAdd,
}: AddTaskDialogProps) {
  return (
    <TaskFormSheet
      mode="add"
      open={open}
      onOpenChange={onOpenChange}
      categories={categories}
      onAdd={onAdd}
    />
  )
}
