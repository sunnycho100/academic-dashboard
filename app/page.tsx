'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Task, Category, SortOption, ViewMode, TaskType } from '@/lib/types'
import { loadState } from '@/lib/store'
import { CategorySidebar } from '@/components/category-sidebar'
import { AddCategoryDialog } from '@/components/add-category-dialog'
import { AddTaskDialog } from '@/components/add-task-sheet'
import { EditTaskSheet } from '@/components/edit-task-sheet'
import { TaskList } from '@/components/task-list'
import { TodayPanel } from '@/components/today-panel'
import { ThemeToggle } from '@/components/theme-toggle'
import { Stats } from '@/components/stats'
import { ClearDataDialog } from '@/components/clear-data-dialog'
import { ImportDataDialog } from '@/components/import-data-dialog'
import { EmptyState } from '@/components/empty-state'
import { TimeRecordsDialog } from '@/components/time-records-dialog'
import { ColorSchemeDialog } from '@/components/color-scheme-dialog'
import { WeeklyPlan, type WeeklyPlanEntry, DAY_LABELS } from '@/components/weekly-plan'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Plus, Settings, Download, Upload, Trash2, Palette, CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'
import { LandingSequence } from '@/components/landing-sequence'
import { IdleOverlay } from '@/components/idle-overlay'
import { useIdleDetector } from '@/hooks/use-idle-detector'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'

const TODAY_STORAGE_KEY = 'class-catchup-today'

function loadTodayIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(TODAY_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveTodayIds(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TODAY_STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [sortOption, setSortOption] = useState<SortOption>('due-date')
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [importDataOpen, setImportDataOpen] = useState(false)
  const [timeRecordsOpen, setTimeRecordsOpen] = useState(false)
  const [colorSchemeOpen, setColorSchemeOpen] = useState(false)
  const [weeklyPlanOpen, setWeeklyPlanOpen] = useState(false)
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyPlanEntry[]>([])
  const [weeklyRefreshKey, setWeeklyRefreshKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [landingComplete, setLandingComplete] = useState(false)
  const [todayTaskIds, setTodayTaskIds] = useState<string[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [completedTodayCount, setCompletedTodayCount] = useState(0)
  const completingRef = useRef<Set<string>>(new Set())

  // Idle / power-save detection (5 minutes of inactivity)
  const { isIdle, resetIdle } = useIdleDetector(5 * 60 * 1000)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    async function loadData() {
      try {
        // Try loading from database first
        const [catRes, taskRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tasks'),
        ])
        const dbCategories = await catRes.json()
        const dbTasks = await taskRes.json()

        if (dbCategories.length > 0 || dbTasks.length > 0) {
          // DB has data — use it
          setCategories(dbCategories)
          setTasks(
            dbTasks.map((t: Record<string, unknown>) => ({
              ...t,
              dueAt: t.dueAt == null ? null : typeof t.dueAt === 'string' ? t.dueAt : new Date(t.dueAt as number).toISOString(),
              createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date(t.createdAt as number).toISOString(),
            }))
          )
        } else {
          // DB empty — seed from localStorage if available
          const localState = loadState()
          if (localState.categories.length > 0 || localState.tasks.length > 0) {
            const seedRes = await fetch('/api/seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categories: localState.categories,
                tasks: localState.tasks,
              }),
            })
            const seedData = await seedRes.json()
            if (seedData.seeded) {
              // Map todayTaskIds from old IDs to new IDs
              const oldTodayIds = loadTodayIds()
              const idMap = seedData.categoryIdMap as Record<string, string>
              // We need to map task IDs too — build from title+category matching
              const taskIdMap: Record<string, string> = {}
              localState.tasks.forEach((oldTask) => {
                const newTask = (seedData.tasks as Array<{ id: string; title: string; categoryId: string }>)
                  .find((nt) => nt.title === oldTask.title && nt.categoryId === (idMap[oldTask.categoryId] ?? oldTask.categoryId))
                if (newTask) taskIdMap[oldTask.id] = newTask.id
              })
              const newTodayIds = oldTodayIds
                .map((oldId) => taskIdMap[oldId])
                .filter(Boolean)
              setTodayTaskIds(newTodayIds)
              saveTodayIds(newTodayIds)

              setCategories(seedData.categories)
              setTasks(seedData.tasks)
            } else {
              setCategories(localState.categories)
              setTasks(localState.tasks)
            }
          }
        }

        // Auto-cleanup: permanently delete tasks soft-deleted >3 days ago
        fetch('/api/completed-tasks/cleanup', { method: 'DELETE' })
          .catch((err) => console.error('Auto-cleanup failed:', err))

        // Fetch today's completed count (respecting day boundaries)
        try {
          const completedRes = await fetch('/api/completed-tasks')
          const completedAll = await completedRes.json()

          // Read day boundaries from localStorage
          let dayStartHour = 0
          let dayEndHour = 24
          try {
            const saved = localStorage.getItem('timeRecords-dayBoundaries')
            if (saved) {
              const { start, end } = JSON.parse(saved)
              if (typeof start === 'number') dayStartHour = start
              if (typeof end === 'number') dayEndHour = end
            }
          } catch {}

          // Compute effective "today start" respecting day boundaries
          const now = new Date()
          const todayStart = new Date(now)
          if (dayEndHour > 24 && now.getHours() < dayEndHour - 24) {
            // Past midnight but before end-hour: still in yesterday's day
            todayStart.setDate(todayStart.getDate() - 1)
          }
          todayStart.setHours(dayStartHour, 0, 0, 0)

          const todayCount = completedAll.filter(
            (ct: { completedAt: string }) => new Date(ct.completedAt) >= todayStart
          ).length
          setCompletedTodayCount(todayCount)
        } catch (err) {
          console.error('Failed to fetch completed tasks count:', err)
        }
      } catch (err) {
        console.error('Failed to load from DB, falling back to localStorage:', err)
        const state = loadState()
        setCategories(state.categories)
        setTasks(state.tasks)
      }
      setTodayTaskIds(loadTodayIds())
      setMounted(true)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (mounted) {
      saveTodayIds(todayTaskIds)
    }
  }, [todayTaskIds, mounted])

  const handleAddCategory = async (name: string) => {
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`
    const order = categories.length
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, order }),
      })
      const newCategory = await res.json()
      setCategories([...categories, newCategory])
    } catch (err) {
      console.error('Failed to create category:', err)
    }
  }

  const handleAddTask = async (taskData: {
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
      setTasks([...tasks, newTask])
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleToggleTask = async (id: string, timeSpentSeconds?: number) => {
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
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setEditTaskOpen(true)
  }

  const handleSaveTask = (updatedTask: Task) => {
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
  }

  const handleDuplicateTask = async (task: Task) => {
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
      setTasks([...tasks, newTask])
    } catch (err) {
      console.error('Failed to duplicate task:', err)
    }
  }

  const handleDeleteTask = (id: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setTodayTaskIds((prev) => prev.filter((tid) => tid !== id))
    // Persist
    fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to delete task:', err))
  }

  const handleRemoveCategory = (categoryId: string) => {
    const removedTaskIds = tasks.filter((t) => t.categoryId === categoryId).map((t) => t.id)
    // Optimistic update
    setCategories(categories.filter((c) => c.id !== categoryId))
    setTasks((prev) => prev.filter((t) => t.categoryId !== categoryId))
    setTodayTaskIds((prev) => prev.filter((id) => !removedTaskIds.includes(id)))
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null)
    }
    // Persist (cascade deletes tasks in DB)
    fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to delete category:', err))
  }

  const handleRenameCategory = (categoryId: string, newName: string) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, name: newName } : c))
    )
    // Persist
    fetch(`/api/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch((err) => console.error('Failed to rename category:', err))
  }

  const handleReorderCategories = (reorderedCategories: Category[]) => {
    // Optimistic update with new order values
    const updated = reorderedCategories.map((c, i) => ({ ...c, order: i }))
    setCategories(updated)
    // Persist each category's new order
    Promise.all(
      updated.map((c) =>
        fetch(`/api/categories/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: c.order }),
        })
      )
    ).catch((err) => console.error('Failed to reorder categories:', err))
  }

  const handleAddToToday = (taskId: string) => {
    if (!todayTaskIds.includes(taskId)) {
      setTodayTaskIds([...todayTaskIds, taskId])
    }
  }

  const handleRemoveFromToday = (taskId: string) => {
    setTodayTaskIds(todayTaskIds.filter((id) => id !== taskId))
  }

  const handleReorderToday = (reorderedIds: string[]) => {
    setTodayTaskIds(reorderedIds)
  }

  const handleGlobalDragStart = (event: DragStartEvent) => {
    // Strip today- prefix so the drag overlay shows the correct task
    const rawId = String(event.active.id)
    setActiveDragId(rawId.startsWith('today-') ? rawId.slice(6) : rawId)
  }

  // Build taskId → day label map from weekly entries
  const weeklyDayLabels = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const entry of weeklyEntries) {
      // Derive day-of-week directly from the date string to avoid week-range mismatch
      const [y, m, d] = String(entry.date).slice(0, 10).split('-').map(Number)
      const dateObj = new Date(y, m - 1, d) // local date, no TZ shift
      const jsDay = dateObj.getDay() // 0=Sun … 6=Sat
      const label = DAY_LABELS[jsDay === 0 ? 6 : jsDay - 1] // DAY_LABELS is Mon-indexed
      if (!map[entry.taskId]) map[entry.taskId] = []
      if (!map[entry.taskId].includes(label)) map[entry.taskId].push(label)
    }
    return map
  }, [weeklyEntries])

  const handleWeeklyEntriesChange = useCallback((entries: WeeklyPlanEntry[]) => {
    setWeeklyEntries(entries)
  }, [])

  /** Extract the real taskId (strips "today-" prefix if present) */
  const extractTaskId = (id: string): string =>
    id.startsWith('today-') ? id.slice(6) : id

  const handleGlobalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (!over) return

    const activeRaw = String(active.id)
    const overRaw = String(over.id)
    const isFromToday = activeRaw.startsWith('today-')
    const taskId = extractTaskId(activeRaw)

    // Drop onto a weekly plan day column (from task list OR today panel)
    if (overRaw.startsWith('weekly-day-')) {
      const dateKey = overRaw.replace('weekly-day-', '')

      // Client-side dedup: check if this task is already on this day
      const alreadyExists = weeklyEntries.some(
        (e) => e.taskId === taskId && String(e.date).slice(0, 10) === dateKey
      )
      if (alreadyExists) return // silently skip — task already scheduled for this day

      // Call API to add entry
      fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, date: dateKey }),
      })
        .then((res) => {
          if (res.ok) return res.json()
          return null // 409 = already exists (server-side dedup)
        })
        .then((entry) => {
          if (entry) {
            setWeeklyEntries((prev) => [...prev, entry])
            setWeeklyRefreshKey((k) => k + 1)
          }
        })
        .catch((err) => console.error('Failed to add weekly plan entry via drag:', err))
      return
    }

    // Drop onto today panel drop zone (only from task list, not from within today)
    if (overRaw === 'today-drop-zone' && !isFromToday) {
      handleAddToToday(taskId)
      return
    }

    // Reorder within today panel (both active and over are today- prefixed)
    if (isFromToday && overRaw.startsWith('today-')) {
      const overTaskId = extractTaskId(overRaw)
      if (taskId === overTaskId) return
      const oldIndex = todayTaskIds.indexOf(taskId)
      const newIndex = todayTaskIds.indexOf(overTaskId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...todayTaskIds]
        const [moved] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, moved)
        handleReorderToday(newOrder)
      }
      return
    }

    // Reorder within the task list (neither is today-prefixed)
    if (!isFromToday && !overRaw.startsWith('today-') && active.id !== over.id) {
      const activeId = String(active.id)
      const overId = String(over.id)
      const oldIndex = tasks.findIndex((t) => t.id === activeId)
      const newIndex = tasks.findIndex((t) => t.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = [...tasks]
        const [movedTask] = newTasks.splice(oldIndex, 1)
        newTasks.splice(newIndex, 0, movedTask)
        const reorderedTasks = newTasks.map((task, index) => ({
          ...task,
          priorityOrder: index,
        }))
        setTasks(reorderedTasks)
        // Persist new order to DB
        fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orders: reorderedTasks.map((t) => ({ id: t.id, priorityOrder: t.priorityOrder })),
          }),
        }).catch((err) => console.error('Failed to persist reorder:', err))
      }
    }
  }

  const activeDragTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null

  const handleExportData = () => {
    const data = { categories, tasks }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `academic-dashboard-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearData = () => {
    setCategories([])
    setTasks([])
    setTodayTaskIds([])
    localStorage.removeItem('class-catchup-data')
    localStorage.removeItem(TODAY_STORAGE_KEY)
    setClearDataOpen(false)
    // Clear DB
    fetch('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    }).catch((err) => console.error('Failed to clear DB:', err))
  }

  const handleImportData = async (data: { categories: Category[]; tasks: Task[] }) => {
    try {
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          categories: data.categories,
          tasks: data.tasks,
        }),
      })
      const result = await res.json()
      if (result.categories && result.tasks) {
        setCategories(result.categories)
        setTasks(result.tasks)
      } else {
        // Fallback to provided data
        setCategories(data.categories)
        setTasks(data.tasks)
      }
    } catch (err) {
      console.error('Failed to import:', err)
      setCategories(data.categories)
      setTasks(data.tasks)
    }
  }

  // Filter tasks by view mode
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredTasks = tasks.filter((task) => {
    // Filter by category
    if (selectedCategoryId && task.categoryId !== selectedCategoryId) {
      return false
    }

    // Filter by view mode
    if (viewMode === 'all') {
      return true
    }

    // Tasks with no due date: show in 'all' only
    if (!task.dueAt) {
      return false
    }

    const dueDate = new Date(task.dueAt)
    dueDate.setHours(0, 0, 0, 0)

    if (viewMode === 'due-soon') {
      return dueDate.getTime() >= today.getTime()
    } else {
      return dueDate.getTime() < today.getTime()
    }
  })

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOption === 'due-date') {
      // Tasks without due date go to the end
      if (!a.dueAt && !b.dueAt) return a.priorityOrder - b.priorityOrder
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      const dateA = new Date(a.dueAt).getTime()
      const dateB = new Date(b.dueAt).getTime()
      if (dateA !== dateB) {
        return viewMode === 'overdue' ? dateA - dateB : dateA - dateB
      }
      return a.priorityOrder - b.priorityOrder
    } else {
      // manual order
      return a.priorityOrder - b.priorityOrder
    }
  })

  const emptyMessage =
    viewMode === 'all'
      ? 'No tasks yet. Add a new task to get started!'
      : viewMode === 'due-soon'
        ? 'No upcoming tasks. Add a new task to get started!'
        : 'No overdue tasks. Great job staying on top of your work!'

  if (!mounted) {
    return null
  }

  // ── Power-save idle mode ──────────────────────────────────────────
  // Unmounts the entire heavy component tree (DnD, Framer Motion,
  // polling intervals, animation loops) while timers keep running
  // via localStorage timestamps. On resume, useTaskTimers reconciles
  // elapsed seconds from the lastTickAt gap.
  if (isIdle) {
    return (
      <IdleOverlay onWakeUp={resetIdle} />
    )
  }

  return (
    <LandingSequence onComplete={() => setLandingComplete(true)}>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleGlobalDragStart}
      onDragEnd={handleGlobalDragEnd}
    >
    <div className="flex h-screen">
      {/* Sidebar */}
      <CategorySidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onAddCategory={() => setAddCategoryOpen(true)}
        onRemoveCategory={handleRemoveCategory}
        onRenameCategory={handleRenameCategory}
        onReorderCategories={handleReorderCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenTimeRecords={() => setTimeRecordsOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="border-b border-white/10 glass-thick px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold tracking-tight text-foreground"
            >
              Class Catch-up
            </motion.h1>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <Settings className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setColorSchemeOpen(true)}>
                    <Palette className="h-4 w-4 mr-2" />
                    Color Scheme
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportDataOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setClearDataOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Show empty state if no categories exist */}
          {categories.length === 0 ? (
            <EmptyState onAddCategory={() => setAddCategoryOpen(true)} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full min-h-0"
            >
              {/* Stats */}
              <Stats tasks={tasks} completedTodayCount={completedTodayCount} todayRemainingCount={todayTaskIds.length} />

              {/* View Tabs + Add Task Button + Controls */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    id="add-task-button"
                    onClick={() => setAddTaskOpen(true)}
                    className="rounded-lg shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={weeklyPlanOpen ? 'default' : 'outline'}
                    onClick={() => setWeeklyPlanOpen(!weeklyPlanOpen)}
                    className="rounded-lg shadow-sm"
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Weekly Plan
                  </Button>
                </motion.div>
                <Tabs
                  value={viewMode}
                  onValueChange={(value) => setViewMode(value as ViewMode)}
                >
                  <TabsList className="rounded-lg">
                    <TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
                    <TabsTrigger value="overdue" className="rounded-md">Overdue</TabsTrigger>
                    <TabsTrigger value="due-soon" className="rounded-md">Due Soon</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex-1" />

                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="group-by-category"
                      checked={groupByCategory}
                      onCheckedChange={(checked) =>
                        setGroupByCategory(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="group-by-category"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Group by category
                    </Label>
                  </div>

                  <Select
                    value={sortOption}
                    onValueChange={(value) => setSortOption(value as SortOption)}
                  >
                    <SelectTrigger className="w-40 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due-date">Sort by due date</SelectItem>
                      <SelectItem value="manual">Manual order</SelectItem>
                    </SelectContent>
                  </Select>

                  <motion.div
                    key={sortedTasks.length}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-sm text-muted-foreground/70 tabular-nums"
                  >
                    {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
                  </motion.div>
                </div>
              </div>

              {/* Weekly Plan (collapsible, above bento grid) */}
              <WeeklyPlan
                tasks={tasks}
                categories={categories}
                open={weeklyPlanOpen}
                onOpenChange={setWeeklyPlanOpen}
                onEntriesChange={handleWeeklyEntriesChange}
                refreshKey={weeklyRefreshKey}
              />

              {/* Bento Grid: Task List + Today's Plan */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 flex-1 min-h-0">
                {/* Task List */}
                <div className="min-w-0 min-h-0 flex flex-col overflow-hidden">
                  <TaskList
                    tasks={sortedTasks}
                    categories={categories}
                    groupByCategory={groupByCategory}
                    onToggleTask={handleToggleTask}
                    onEditTask={handleEditTask}
                    onSaveTask={handleSaveTask}
                    onDuplicateTask={handleDuplicateTask}
                    onDeleteTask={handleDeleteTask}
                    onAddToToday={handleAddToToday}
                    onRemoveFromToday={handleRemoveFromToday}
                    todayTaskIds={todayTaskIds}
                    sortOption={sortOption}
                    emptyMessage={emptyMessage}
                    weeklyDayLabels={weeklyDayLabels}
                  />
                </div>

                {/* Today's Plan — fills column height */}
                <div className="min-h-0 flex flex-col overflow-hidden">
                  <TodayPanel
                    tasks={todayTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[]}
                    allTasks={tasks}
                    categories={categories}
                    onRemoveFromToday={handleRemoveFromToday}
                    onToggleTask={handleToggleTask}
                    onReorderToday={handleReorderToday}
                    isDragging={!!activeDragId}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeDragTask && (() => {
          const dragCat = categories.find(c => c.id === activeDragTask.categoryId)
          return (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.05, rotate: 2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl p-3 max-w-sm cursor-grabbing"
              style={{
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15), 0 12px 28px -8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
              }}
            >
              <div className="flex items-center gap-3">
                {dragCat && (
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: dragCat.color }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activeDragTask.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {dragCat && (
                      <span className="text-[11px] text-muted-foreground/60">{dragCat.name}</span>
                    )}
                    <span className="text-muted-foreground/30 text-[11px]">&middot;</span>
                    <span className="text-[11px] text-muted-foreground/50">{activeDragTask.type}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })()}
      </DragOverlay>

      {/* Dialogs */}
      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        onAdd={handleAddCategory}
      />
      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        categories={categories}
        onAdd={handleAddTask}
      />
      <EditTaskSheet
        key={taskToEdit?.id ?? 'no-task'}
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        task={taskToEdit}
        categories={categories}
        onSave={handleSaveTask}
      />
      <ClearDataDialog
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        onConfirm={handleClearData}
      />
      <ImportDataDialog
        open={importDataOpen}
        onOpenChange={setImportDataOpen}
        onImport={handleImportData}
      />
      <TimeRecordsDialog
        open={timeRecordsOpen}
        onOpenChange={setTimeRecordsOpen}
      />
      <ColorSchemeDialog
        open={colorSchemeOpen}
        onOpenChange={setColorSchemeOpen}
        categories={categories}
        onCategoryColorChange={async (id, color) => {
          // Optimistic update
          setCategories((prev) =>
            prev.map((c) => (c.id === id ? { ...c, color } : c))
          )
          // Persist to DB
          try {
            await fetch(`/api/categories/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ color }),
            })
          } catch (err) {
            console.error('Failed to update category color:', err)
          }
        }}
      />
    </div>
    </DndContext>
    </LandingSequence>
  )
}
