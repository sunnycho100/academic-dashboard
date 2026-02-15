export type TaskType = 'Lecture' | 'Discussion' | 'Lab' | 'Assignment' | 'Exam Prep'

export interface Category {
  id: string
  name: string
  color: string
  order: number
}

export interface Task {
  id: string
  categoryId: string
  title: string
  type: TaskType
  dueAt: string | null
  status: 'todo' | 'done'
  priorityOrder: number
  notes?: string
  estimatedDuration?: number
  actualTimeSpent?: number // in minutes
  createdAt: string
}

export type SortOption = 'due-date' | 'manual'
export type ViewMode = 'all' | 'overdue' | 'due-soon'
