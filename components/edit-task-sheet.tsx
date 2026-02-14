'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Category, Task, TaskType } from '@/lib/types'

interface EditTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  categories: Category[]
  onSave: (task: Task) => void
}

const taskTypes: TaskType[] = [
  'Lecture',
  'Discussion',
  'Lab',
  'Assignment',
  'Exam Prep',
]

export function EditTaskSheet({
  open,
  onOpenChange,
  task,
  categories,
  onSave,
}: EditTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<TaskType>('Lecture')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setCategoryId(task.categoryId)
      setType(task.type)
      setDueDate(new Date(task.dueAt).toISOString().split('T')[0])
      setNotes(task.notes || '')
      setDurationHours(task.estimatedDuration ? String(Math.floor(task.estimatedDuration / 60)) : '')
      setDurationMinutes(task.estimatedDuration ? String(task.estimatedDuration % 60) : '')
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (task && title.trim() && categoryId && dueDate) {
      onSave({
        ...task,
        title: title.trim(),
        categoryId,
        type,
        dueAt: new Date(dueDate).toISOString(),
        notes: notes.trim() || undefined,
        estimatedDuration: (durationHours || durationMinutes)
          ? (parseInt(durationHours || '0') * 60) + parseInt(durationMinutes || '0') || undefined
          : undefined,
      })
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>
            Make changes to your task details.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title">Task Title</Label>
            <Input
              id="edit-task-title"
              placeholder="e.g., Watch Lecture 12"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="edit-task-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-type">Task Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as TaskType)}
            >
              <SelectTrigger id="edit-task-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((taskType) => (
                  <SelectItem key={taskType} value={taskType}>
                    {taskType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-due-date">Due Date</Label>
            <Input
              id="edit-task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Est. Duration</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  id="edit-task-duration-hours"
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground">hr</span>
              <div className="flex-1">
                <Input
                  id="edit-task-duration-minutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-notes">Notes (Optional)</Label>
            <Textarea
              id="edit-task-notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <SheetFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !categoryId || !dueDate}>
              Save Changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
