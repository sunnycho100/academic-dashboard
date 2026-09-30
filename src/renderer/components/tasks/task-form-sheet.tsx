import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Category, Task, TaskType } from '@/lib/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskFormSheetBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
}

interface AddModeProps extends TaskFormSheetBaseProps {
  mode: 'add'
  task?: undefined
  /** Course to preselect, e.g. the one filtered in the sidebar */
  defaultCategoryId?: string | null
  onAdd: (taskData: {
    title: string
    categoryId: string
    type: TaskType
    dueAt: string | null
    notes?: string
    estimatedDuration?: number
  }) => void
  onSave?: undefined
}

interface EditModeProps extends TaskFormSheetBaseProps {
  mode: 'edit'
  task: Task | null
  defaultCategoryId?: undefined
  onSave: (task: Task) => void
  onAdd?: undefined
}

export type TaskFormSheetProps = AddModeProps | EditModeProps

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const taskTypes: TaskType[] = ['Lecture', 'Discussion', 'Lab', 'Assignment', 'Exam Prep']
const estimateChips = [15, 30, 60, 90]
const LAST_COURSE_KEY = 'task-form-last-course'

/** yyyy-mm-dd in local time (toISOString would give the UTC date and shift it a day). */
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return localDate(d)
}

const dueChips = [
  { label: 'Today', value: () => inDays(0) },
  { label: 'Tomorrow', value: () => inDays(1) },
  { label: 'Next week', value: () => inDays(7) },
]

function lastCourse(): string | null {
  try {
    return localStorage.getItem(LAST_COURSE_KEY)
  } catch {
    return null
  }
}

const fieldLabel = 'text-xs uppercase tracking-wider text-muted-foreground'
// Choices are plain text; the chosen one is underlined, like the Due and Estimate quick picks
const choiceRow = 'mt-2 flex flex-wrap gap-x-5 gap-y-2'
const choice =
  'border-b-2 border-transparent pb-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const choiceIdle = 'text-muted-foreground hover:text-foreground'
// A hairline focus ring; the global two-pixel offset ring is too heavy inside the form
const field = 'mt-2 focus-visible:ring-1 focus-visible:ring-offset-0'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskFormSheet(props: TaskFormSheetProps) {
  const { mode, open, onOpenChange } = props
  const shouldRender = mode === 'edit' ? open && props.task !== null : open

  // Radix unmounts the content on close, so the form's state starts fresh on every open.
  return (
    <Dialog open={shouldRender} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] gap-0 p-0" aria-describedby={undefined}>
        <TaskForm {...props} />
      </DialogContent>
    </Dialog>
  )
}

function TaskForm(props: TaskFormSheetProps) {
  const { mode, onOpenChange, categories } = props
  const isEdit = mode === 'edit'
  const editTask = isEdit ? props.task : null

  const initialCourse = () => {
    if (editTask) return editTask.categoryId
    const ids = categories.map((c) => c.id)
    const candidates = [props.defaultCategoryId, lastCourse(), ids.length === 1 ? ids[0] : null]
    return candidates.find((id) => id && ids.includes(id)) ?? ''
  }

  const [title, setTitle] = useState(editTask?.title ?? '')
  const [categoryId, setCategoryId] = useState(initialCourse)
  const [type, setType] = useState<TaskType>(editTask?.type ?? 'Lecture')
  const [dueDate, setDueDate] = useState(editTask?.dueAt ? localDate(new Date(editTask.dueAt)) : '')
  const [estimate, setEstimate] = useState(editTask?.estimatedDuration ? String(editTask.estimatedDuration) : '')
  const [notes, setNotes] = useState(editTask?.notes ?? '')
  const [showNotes, setShowNotes] = useState(Boolean(editTask?.notes))
  const formRef = useRef<HTMLFormElement>(null)

  const valid = Boolean(title.trim() && categoryId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return

    const dueAt = dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : null
    const estimatedDuration = parseInt(estimate) > 0 ? parseInt(estimate) : undefined
    const fields = { title: title.trim(), categoryId, type, dueAt, notes: notes.trim() || undefined, estimatedDuration }

    if (isEdit && editTask) {
      props.onSave({ ...editTask, ...fields })
    } else if (!isEdit) {
      try {
        localStorage.setItem(LAST_COURSE_KEY, categoryId)
      } catch {}
      props.onAdd(fields)
    }
    onOpenChange(false)
  }

  // Cmd+Enter submits from anywhere, including the notes field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div className="px-6 pt-6">
        <DialogTitle className="font-serif text-2xl font-normal">{isEdit ? 'Edit task' : 'New task'}</DialogTitle>

        <input
          autoFocus
          aria-label="Task name"
          placeholder="Task name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-4 w-full border-b border-border bg-transparent pb-2 text-lg placeholder:text-muted-foreground/70 focus:border-foreground focus-visible:[box-shadow:none]"
        />
      </div>

      <div className="space-y-5 px-6 py-5">
        <fieldset>
          <legend className={fieldLabel}>Course</legend>
          <div role="radiogroup" aria-label="Course" className={choiceRow}>
            {categories.map((cat) => {
              const on = cat.id === categoryId
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(choice, on ? 'text-foreground' : choiceIdle)}
                  // The course color only appears on the chosen one, as its underline
                  style={{ borderBottomColor: on ? cat.color : 'transparent' }}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={fieldLabel}>Type</legend>
          <div role="radiogroup" aria-label="Type" className={choiceRow}>
            {taskTypes.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={t === type}
                onClick={() => setType(t)}
                className={cn(choice, t === type ? 'border-foreground text-foreground' : choiceIdle)}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-due" className={fieldLabel}>
              Due
            </label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={cn(field, 'h-9')}
            />
            <div className="mt-2 flex gap-3 text-xs">
              {dueChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setDueDate(c.value())}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    dueDate === c.value() && 'text-foreground underline underline-offset-4',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="task-estimate" className={fieldLabel}>
              Estimate
            </label>
            <div className="relative mt-2">
              <Input
                id="task-estimate"
                type="number"
                inputMode="numeric"
                min={0}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="h-9 pr-12 tabular-nums focus-visible:ring-1 focus-visible:ring-offset-0"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                min
              </span>
            </div>
            <div className="mt-2 flex gap-3 text-xs tabular-nums">
              {estimateChips.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEstimate(String(m))}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    estimate === String(m) && 'text-foreground underline underline-offset-4',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showNotes ? (
          <div>
            <label htmlFor="task-notes" className={fieldLabel}>
              Note
            </label>
            <Textarea
              id="task-notes"
              autoFocus={!isEdit}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(field, 'resize-none')}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Add a note
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <span className="mr-auto text-xs text-muted-foreground">⌘ Return to {isEdit ? 'save' : 'add'}</span>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
          Cancel
        </Button>
        <Button type="submit" disabled={!valid} className="rounded-full px-5">
          {isEdit ? 'Save' : 'Add task'}
        </Button>
      </div>
    </form>
  )
}
