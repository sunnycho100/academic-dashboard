'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Task, Category, SortOption, ViewMode } from '@/lib/types'
import { CategorySidebar } from '@/components/category-sidebar'
import { AddCategoryDialog } from '@/components/add-category-dialog'
import { AddTaskDialog } from '@/components/add-task-sheet'
import { EditTaskSheet } from '@/components/edit-task-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { ClearDataDialog } from '@/components/clear-data-dialog'
import { ImportDataDialog } from '@/components/import-data-dialog'
import { TimeRecordsDialog } from '@/components/time-records-dialog'
import { ColorSchemeDialog } from '@/components/color-scheme-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { type WeeklyPlanEntry, DAY_LABELS } from '@/components/weekly-plan'
import { CatchupContent } from '@/components/catchup-content'
import { TimetableContent } from '@/components/timetable-content'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Settings, Download, Upload, Trash2, Palette, Clock, AlertTriangle, LogOut, UserPen, LogIn } from 'lucide-react'
import { EditPersonalInfoDialog } from '@/components/edit-personal-info-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'demo-1', userId: '', name: 'CS 400', color: 'hsl(110, 70%, 50%)', order: 1 },
  { id: 'demo-2', userId: '', name: 'ECE 222', color: 'hsl(5, 70%, 50%)', order: 2 },
  { id: 'demo-3', userId: '', name: 'CS 354', color: 'hsl(76, 70%, 50%)', order: 3 },
  { id: 'demo-4', userId: '', name: 'ECE 340', color: 'hsl(15, 70%, 50%)', order: 4 },
]

function loadTodayIds(userId: string | null): string[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const stored = localStorage.getItem(`class-catchup-today-${userId}`)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveTodayIds(ids: string[], userId: string | null) {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`class-catchup-today-${userId}`, JSON.stringify(ids))
  } catch {}
}

function getTodayDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** On day change, archive current today IDs as "previous day" */
function archivePreviousDayIfNeeded(userId: string, currentIds: string[]) {
  if (typeof window === 'undefined') return
  const dateKey = `class-catchup-today-date-${userId}`
  const prevKey = `class-catchup-yesterday-${userId}`
  const storedDate = localStorage.getItem(dateKey)
  const today = getTodayDateKey()
  if (storedDate && storedDate !== today) {
    // Day changed — archive whatever was in today as yesterday
    localStorage.setItem(prevKey, JSON.stringify(currentIds))
  }
  localStorage.setItem(dateKey, today)
}

function loadYesterdayIds(userId: string | null): string[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const stored = localStorage.getItem(`class-catchup-yesterday-${userId}`)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [weeklyPlanOpen, setWeeklyPlanOpen] = useState(false)
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyPlanEntry[]>([])
  const [weeklyRefreshKey, setWeeklyRefreshKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [landingComplete, setLandingComplete] = useState(false)
  const [todayTaskIds, setTodayTaskIds] = useState<string[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [completedTodayCount, setCompletedTodayCount] = useState(0)
  const [activeMainTab, setActiveMainTab] = useState<'catchup' | 'timetable'>('catchup')
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [editPersonalInfoOpen, setEditPersonalInfoOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const completingRef = useRef<Set<string>>(new Set())

  // Idle / power-save detection (5 minutes of inactivity)
  const { isIdle, resetIdle } = useIdleDetector(5 * 60 * 1000)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Task & Category mutation hooks
  const {
    handleAddTask,
    handleToggleTask,
    handleSaveTask,
    handleDuplicateTask,
    handleDeleteTask,
    handleDeleteAllTasks,
  } = useTasks({
    tasks,
    setTasks,
    setTodayTaskIds,
    setCompletedTodayCount,
    categories,
    completingRef,
  })

  const {
    handleAddCategory,
    handleRemoveCategory,
    handleRenameCategory,
    handleReorderCategories,
    handleCategoryColorChange,
  } = useCategories({
    categories,
    setCategories,
    setTasks,
    setTodayTaskIds,
    selectedCategoryId,
    setSelectedCategoryId,
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch authenticated user
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser({ id: authUser.id, email: authUser.email || '' })
        }

        if (!authUser) {
          // Guest mode: load default categories, empty tasks
          setCategories(DEFAULT_CATEGORIES)
          setTasks([])
          setMounted(true)
          return
        }

        // Authenticated: load from database
        const [catRes, taskRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tasks'),
        ])
        const dbCategories = await catRes.json()
        const dbTasks = await taskRes.json()

        setCategories(dbCategories)
        setTasks(
          dbTasks.map((t: Record<string, unknown>) => ({
            ...t,
            dueAt: t.dueAt == null ? null : typeof t.dueAt === 'string' ? t.dueAt : new Date(t.dueAt as number).toISOString(),
            createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date(t.createdAt as number).toISOString(),
          }))
        )

        // Auto-cleanup: permanently delete tasks soft-deleted >3 days ago
        fetch('/api/completed-tasks/cleanup', { method: 'DELETE' })
          .catch((err) => console.error('Auto-cleanup failed:', err))

        // Fetch today's completed count (respecting day boundaries)
        try {
          const completedRes = await fetch('/api/completed-tasks')
          const completedAll = completedRes.ok ? await completedRes.json() : []

          if (!Array.isArray(completedAll)) throw new Error('Expected array from /api/completed-tasks')

          // Read day boundaries from localStorage
          let dayStartHour = 6
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
        console.error('Failed to load data:', err)
      }
      setMounted(true)
    }
    loadData()
  }, [])

  // Load today IDs once user is available & archive previous day if date changed
  useEffect(() => {
    if (user) {
      const ids = loadTodayIds(user.id)
      archivePreviousDayIfNeeded(user.id, ids)
      setTodayTaskIds(ids)
    }
  }, [user])

  useEffect(() => {
    if (mounted && user) {
      saveTodayIds(todayTaskIds, user.id)
    }
  }, [todayTaskIds, mounted, user])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setEditTaskOpen(true)
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

  /** Carry over incomplete tasks from yesterday's plan */
  const handleCarryOverYesterday = useCallback(() => {
    if (!user) return
    const yesterdayIds = loadYesterdayIds(user.id)
    if (yesterdayIds.length === 0) return
    // Only add tasks that still exist, are incomplete, and aren't already in today
    const newIds = yesterdayIds.filter(
      (id) =>
        !todayTaskIds.includes(id) &&
        tasks.some((t) => t.id === id && t.status === 'todo')
    )
    if (newIds.length > 0) {
      setTodayTaskIds((prev) => [...prev, ...newIds])
    }
  }, [user, todayTaskIds, tasks])

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
    if (user) localStorage.removeItem(`class-catchup-today-${user.id}`)
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

  return (
    <>
    {/* ── Power-save idle overlay ──────────────────────────────────────
         Renders on TOP of the dashboard instead of replacing it.
         The dashboard stays mounted (hidden via CSS) so timers,
         intervals, and all hook state remain alive.
         On wake-up the overlay unmounts and the dashboard is revealed. */}
    {isIdle && <IdleOverlay onWakeUp={resetIdle} userId={user?.id} />}

    <div style={isIdle ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
    <LandingSequence onComplete={() => setLandingComplete(true)} skip={landingComplete} userEmail={user?.email}>
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
            {/* Tab navigation */}
            <div className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.03] p-1.5 border border-foreground/[0.05] shadow-inner dark:bg-background/40">
              <button
                onClick={() => setActiveMainTab('catchup')}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeMainTab === 'catchup'
                    ? 'text-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.02]'
                }`}
              >
                {activeMainTab === 'catchup' && (
                  <motion.div
                    layoutId="mainTabIndicator"
                    className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/50"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 tracking-tight">Class Catch-up</span>
              </button>
              <button
                onClick={() => setActiveMainTab('timetable')}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  activeMainTab === 'timetable'
                    ? 'text-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.02]'
                }`}
              >
                {activeMainTab === 'timetable' && (
                  <motion.div
                    layoutId="mainTabIndicator"
                    className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/50"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Clock className="h-4 w-4 relative z-10" />
                <span className="relative z-10 tracking-tight">Timetable</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {activeMainTab === 'catchup' && tasks.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteAllOpen(true)}
                  className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Delete all tasks</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <Settings className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    General Settings
                  </DropdownMenuItem>
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
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold uppercase">
                        {user.email.charAt(0)}
                      </div>
                      <span className="sr-only">User menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditPersonalInfoOpen(true)}>
                      <UserPen className="h-4 w-4 mr-2" />
                      Edit Personal Info
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => window.location.href = '/login'}>
                  <LogIn className="h-4 w-4" />
                  <span className="sr-only">Log in</span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {activeMainTab === 'timetable' ? (
            <TimetableContent />
          ) : (
            <CatchupContent
              tasks={tasks}
              categories={categories}
              sortedTasks={sortedTasks}
              todayTaskIds={todayTaskIds}
              activeDragId={activeDragId}
              completedTodayCount={completedTodayCount}
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortOption={sortOption}
              setSortOption={setSortOption}
              groupByCategory={groupByCategory}
              setGroupByCategory={setGroupByCategory}
              weeklyPlanOpen={weeklyPlanOpen}
              setWeeklyPlanOpen={setWeeklyPlanOpen}
              weeklyRefreshKey={weeklyRefreshKey}
              weeklyDayLabels={weeklyDayLabels}
              emptyMessage={emptyMessage}
              onAddTaskOpen={() => setAddTaskOpen(true)}
              onAddCategoryOpen={() => setAddCategoryOpen(true)}
              onToggleTask={handleToggleTask}
              onEditTask={handleEditTask}
              onSaveTask={handleSaveTask}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onAddToToday={handleAddToToday}
              onRemoveFromToday={handleRemoveFromToday}
              onReorderToday={handleReorderToday}
              onCarryOverYesterday={handleCarryOverYesterday}
              hasYesterdayTasks={user ? loadYesterdayIds(user.id).some(
                (id) => !todayTaskIds.includes(id) && tasks.some((t) => t.id === id && t.status === 'todo')
              ) : false}
              onWeeklyEntriesChange={handleWeeklyEntriesChange}
              userId={user?.id}
            />
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
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
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
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete all tasks?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {tasks.length} active task{tasks.length !== 1 ? 's' : ''}? This will remove them from both the task list and today&apos;s plan. Your completed task history and time records will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteAllTasks()
                setDeleteAllOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete all tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ColorSchemeDialog
        open={colorSchemeOpen}
        onOpenChange={setColorSchemeOpen}
        categories={categories}
        onCategoryColorChange={handleCategoryColorChange}
      />
      <EditPersonalInfoDialog
        open={editPersonalInfoOpen}
        onOpenChange={setEditPersonalInfoOpen}
      />
    </div>
    </DndContext>
    </LandingSequence>
    </div>
    </>
  )
}
