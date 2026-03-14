'use client'

import { useCallback } from 'react'
import { Task, TaskType } from '@/lib/types'

interface UseTasksOptions {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setTodayTaskIds: React.Dispatch<React.SetStateAction<string[]>>
  setCompletedTodayCount: React.Dispatch<React.SetStateAction<number>>
  categories: { id: string; name?: string; color?: string }[]
  completingRef: React.MutableRefObject<Set<string>>
}

export function useTasks({
  tasks,
  setTasks,
  setTodayTaskIds,
  setCompletedTodayCount,
  categories,
  completingRef,
}: UseTasksOptions) {
  const handleAddTask = useCallback(async (taskData: {
    title: string
    categoryId: string
    type: TaskType
    dueAt: string | null
    notes?: string
    estimatedDuration?: number
  }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          priorityOrder: tasks.length,
        }),
      })
      const newTask = await res.json()
      setTasks((prev) => [...prev, newTask])
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }, [tasks.length, setTasks])

  const handleToggleTask = useCallback(async (id: string, timeSpentSeconds?: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    // Guard: prevent double-click from creating duplicate completions
    if (task.status === 'todo' && completingRef.current.has(id)) return
    
    const isCompletingTask = task.status === 'todo'
    const actualMinutes =
      timeSpentSeconds !== undefined ? Math.round(timeSpentSeconds / 60) : undefined

    if (isCompletingTask) {
      // Mark as in-progress to prevent double-click
      completingRef.current.add(id)

      // Optimistic: remove from UI immediately
      setTasks((prev) => prev.filter((t) => t.id !== id))
      setTodayTaskIds((prev) => prev.filter((tid) => tid !== id))
      setCompletedTodayCount((prev) => prev + 1)

      // Archive to CompletedTask table
      const category = categories.find((c) => c.id === task.categoryId)
      try {
        await fetch('/api/completed-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskTitle: task.title,
            categoryName: category?.name ?? 'Unknown',
            categoryColor: category?.color ?? '#888',
            taskType: task.type,
            dueAt: task.dueAt,
            actualTimeSpent: actualMinutes ?? task.actualTimeSpent ?? null,
            estimatedDuration: task.estimatedDuration ?? null,
            notes: task.notes ?? null,
          }),
        })
      } catch (err) {
        console.error('Failed to archive completed task:', err)
      }

      // Delete from active Task table
      try {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Failed to delete completed task from active table:', err)
      }

      completingRef.current.delete(id)
    } else {
      // Un-completing (done → todo) — just toggle status
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: 'todo' as const } : t
        )
      )
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'todo' }),
      }).catch((err) => console.error('Failed to update task status:', err))
    }
  }, [tasks, categories, setTasks, setTodayTaskIds, setCompletedTodayCount, completingRef])

  const handleSaveTask = useCallback((updatedTask: Task) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    )
    // Persist to DB
    fetch(`/api/tasks/${updatedTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updatedTask.title,
        categoryId: updatedTask.categoryId,
        type: updatedTask.type,
        dueAt: updatedTask.dueAt,
        notes: updatedTask.notes ?? null,
        estimatedDuration: updatedTask.estimatedDuration ?? null,
      }),
    }).catch((err) => console.error('Failed to update task:', err))
  }, [setTasks])

  const handleDuplicateTask = useCallback(async (task: Task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${task.title} (Copy)`,
          categoryId: task.categoryId,
          type: task.type,
          dueAt: task.dueAt,
          notes: task.notes,
          estimatedDuration: task.estimatedDuration,
          priorityOrder: tasks.length,
        }),
      })
      const newTask = await res.json()
      setTasks((prev) => [...prev, newTask])
    } catch (err) {
      console.error('Failed to duplicate task:', err)
    }
  }, [tasks.length, setTasks])

  const handleDeleteTask = useCallback((id: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setTodayTaskIds((prev) => prev.filter((tid) => tid !== id))
    // Persist
    fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to delete task:', err))
  }, [setTasks, setTodayTaskIds])

  const handleDeleteAllTasks = useCallback(async () => {
    // Optimistic update: clear tasks and today panel
    setTasks([])
    setTodayTaskIds([])
    localStorage.removeItem('class-catchup-today')
    // Delete all active tasks from DB (keeps completed-tasks & time-records intact)
    try {
      await fetch('/api/tasks', { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete all tasks:', err)
    }
  }, [setTasks, setTodayTaskIds])

  return {
    handleAddTask,
    handleToggleTask,
    handleSaveTask,
    handleDuplicateTask,
    handleDeleteTask,
    handleDeleteAllTasks,
  }
}
