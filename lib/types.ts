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

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

export interface TimetableEntry {
  id: string
  date: string              // ISO date string, e.g. "2025-06-15"
  order: number             // display order within the day
  plannedStart: string      // "HH:mm" format
  plannedEnd: string        // "HH:mm" format
  expectedMinutes: number   // auto-calculated from planned start/end
  activityName: string
  actualStart: string | null
  actualEnd: string | null
  actualMinutes: number | null
  notes: string
  createdAt: string
  updatedAt: string
}
