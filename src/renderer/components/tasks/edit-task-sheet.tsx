import { Category, Task } from '@/lib/types'
import { TaskFormSheet } from '@/components/tasks/task-form-sheet'

interface EditTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  categories: Category[]
  onSave: (task: Task) => void
}

export function EditTaskSheet({
  open,
  onOpenChange,
  task,
  categories,
  onSave,
}: EditTaskSheetProps) {
  return (
    <TaskFormSheet
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      categories={categories}
      task={task}
      onSave={onSave}
    />
  )
}
