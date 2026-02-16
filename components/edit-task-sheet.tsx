'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Category, Task, TaskType } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil } from 'lucide-react'

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
  const [title, setTitle] = useState(task?.title ?? '')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? '')
  const [type, setType] = useState<TaskType>(task?.type ?? 'Lecture')
  const [dueDate, setDueDate] = useState(task?.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [isOverdue, setIsOverdue] = useState(() => {
    if (!task?.dueAt) return false
    const dueDay = new Date(task.dueAt)
    dueDay.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDay.getTime() < today.getTime()
  })
  const [durationHours, setDurationHours] = useState(task?.estimatedDuration ? String(Math.floor(task.estimatedDuration / 60)) : '')
  const [durationMinutes, setDurationMinutes] = useState(task?.estimatedDuration ? String(task.estimatedDuration % 60) : '')
  const [showContent, setShowContent] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && task) {
      setTitle(task.title)
      setCategoryId(task.categoryId)
      setType(task.type)
      setDueDate(task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '')
      setNotes(task.notes || '')
      setDurationHours(task.estimatedDuration ? String(Math.floor(task.estimatedDuration / 60)) : '')
      setDurationMinutes(task.estimatedDuration ? String(task.estimatedDuration % 60) : '')
      setActiveField(null)
      // Compute overdue from dueAt
      if (task.dueAt) {
        const dueDay = new Date(task.dueAt)
        dueDay.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        setIsOverdue(dueDay.getTime() < today.getTime())
      } else {
        setIsOverdue(false)
      }
    }
  }, [open, task])

  // Staggered reveal
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setShowContent(true)
        setTimeout(() => titleInputRef.current?.focus(), 100)
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (task && title.trim() && categoryId) {
      onSave({
        ...task,
        title: title.trim(),
        categoryId,
        type,
        dueAt: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : null,
        notes: notes.trim() || undefined,
        estimatedDuration: (durationHours || durationMinutes)
          ? (parseInt(durationHours || '0') * 60) + parseInt(durationMinutes || '0') || undefined
          : undefined,
      })
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    setShowContent(false)
    setTimeout(() => onOpenChange(false), 150)
  }

  const formFields = [
    { id: 'title', delay: 0 },
    { id: 'category', delay: 0.04 },
    { id: 'type', delay: 0.08 },
    { id: 'date', delay: 0.12 },
    { id: 'duration', delay: 0.15 },
    { id: 'overdue', delay: 0.18 },
    { id: 'notes', delay: 0.22 },
  ]

  return (
    <AnimatePresence mode="wait">
      {open && task && (
        <div key={task.id}>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Dialog container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              className="pointer-events-auto w-full max-w-lg mx-4"
              initial={{ opacity: 0, scale: 0.75, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 28,
                mass: 0.8,
              }}
            >
              <motion.div
                className="relative glass-overlay border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                initial={{ boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' }}
                animate={{
                  boxShadow: showContent
                    ? '0 25px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.05)'
                    : '0 0 0 0 rgba(59, 130, 246, 0)',
                }}
                transition={{ duration: 0.4 }}
              >
                {/* Animated top gradient bar */}
                <motion.div
                  className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                  style={{ transformOrigin: 'left' }}
                />

                <div className="p-6 max-h-[80vh] overflow-y-auto">
                  {/* Header */}
                  <motion.div
                    className="flex items-center justify-between mb-5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -10 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                      >
                        <Pencil className="h-5 w-5 text-amber-500" />
                      </motion.div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">Edit Task</h2>
                        <p className="text-xs text-muted-foreground">
                          Make changes to your task details.
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleClose}
                      className="rounded-full p-1.5 hover:bg-secondary/80 transition-colors"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  </motion.div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Task Title */}
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        x: showContent ? 0 : -20,
                      }}
                      transition={{ duration: 0.3, delay: formFields[0].delay }}
                    >
                      <Label htmlFor="edit-task-title" className="text-sm font-medium">
                        Task Title
                      </Label>
                      <motion.div
                        animate={{
                          borderColor: activeField === 'title' ? 'hsl(var(--ring))' : 'transparent',
                        }}
                        className="rounded-lg border-2 border-transparent transition-colors"
                      >
                        <Input
                          ref={titleInputRef}
                          id="edit-task-title"
                          placeholder="e.g., Watch Lecture 12"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          onFocus={() => setActiveField('title')}
                          onBlur={() => setActiveField(null)}
                          className="border-border/50 focus-visible:ring-0 focus-visible:border-transparent"
                        />
                      </motion.div>
                    </motion.div>

                    {/* Category & Type row */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: showContent ? 1 : 0,
                          x: showContent ? 0 : -20,
                        }}
                        transition={{ duration: 0.3, delay: formFields[1].delay }}
                      >
                        <Label htmlFor="edit-task-category" className="text-sm font-medium">
                          Category
                        </Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger id="edit-task-category" className="border-border/50">
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
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: showContent ? 1 : 0,
                          x: showContent ? 0 : -20,
                        }}
                        transition={{ duration: 0.3, delay: formFields[2].delay }}
                      >
                        <Label htmlFor="edit-task-type" className="text-sm font-medium">
                          Task Type
                        </Label>
                        <Select
                          value={type}
                          onValueChange={(value) => setType(value as TaskType)}
                        >
                          <SelectTrigger id="edit-task-type" className="border-border/50">
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
                      </motion.div>
                    </div>

                    {/* Due Date */}
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        x: showContent ? 0 : -20,
                      }}
                      transition={{ duration: 0.3, delay: formFields[3].delay }}
                    >
                      <Label htmlFor="edit-task-due-date" className="text-sm font-medium">
                        Due Date
                      </Label>
                      <Input
                        id="edit-task-due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="border-border/50"
                      />
                    </motion.div>

                    {/* Est. Duration */}
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        x: showContent ? 0 : -20,
                      }}
                      transition={{ duration: 0.3, delay: formFields[4].delay }}
                    >
                      <Label className="text-sm font-medium">
                        Est. Duration
                      </Label>
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
                            className="border-border/50"
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
                            className="border-border/50"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </motion.div>

                    {/* Overdue checkbox */}
                    <motion.div
                      className="flex items-center space-x-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        x: showContent ? 0 : -20,
                      }}
                      transition={{ duration: 0.3, delay: formFields[5].delay }}
                    >
                      <Checkbox
                        id="edit-task-overdue"
                        checked={isOverdue}
                        onCheckedChange={(checked) => setIsOverdue(checked as boolean)}
                        className="h-4 w-4 rounded"
                      />
                      <Label
                        htmlFor="edit-task-overdue"
                        className="text-sm font-normal cursor-pointer text-muted-foreground"
                      >
                        Mark as overdue
                      </Label>
                    </motion.div>

                    {/* Notes */}
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        x: showContent ? 0 : -20,
                      }}
                      transition={{ duration: 0.3, delay: formFields[6].delay }}
                    >
                      <Label htmlFor="edit-task-notes" className="text-sm font-medium">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id="edit-task-notes"
                        placeholder="Add any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="border-border/50 resize-none"
                      />
                    </motion.div>

                    {/* Footer buttons */}
                    <motion.div
                      className="flex justify-end gap-2 pt-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        y: showContent ? 0 : 10,
                      }}
                      transition={{ duration: 0.3, delay: 0.25 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          type="submit"
                          disabled={!title.trim() || !categoryId}
                          className="rounded-lg shadow-sm"
                        >
                          <Pencil className="h-4 w-4 mr-1.5" />
                          Save Changes
                        </Button>
                      </motion.div>
                    </motion.div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
