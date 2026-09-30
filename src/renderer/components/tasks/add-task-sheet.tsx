import { Category, TaskType } from '@/lib/types'
import { TaskFormSheet } from '@/components/tasks/task-form-sheet'

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  defaultCategoryId?: string | null
  onAdd: (task: {
    title: string
    categoryId: string
    type: TaskType
    dueAt: string | null
    notes?: string
    estimatedDuration?: number
  }) => void
}

export function AddTaskDialog({
  open,
  onOpenChange,
  categories,
  defaultCategoryId,
  onAdd,
}: AddTaskDialogProps) {
  return (
    <TaskFormSheet
      mode="add"
      open={open}
      onOpenChange={onOpenChange}
      categories={categories}
      defaultCategoryId={defaultCategoryId}
      onAdd={onAdd}
    />
  )
}
