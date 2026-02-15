'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Plus, Settings, Download, Upload, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [importDataOpen, setImportDataOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [todayTaskIds, setTodayTaskIds] = useState<string[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const completingRef = useRef<Set<string>>(new Set())

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
              dueAt: typeof t.dueAt === 'string' ? t.dueAt : new Date(t.dueAt as number).toISOString(),
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
    dueAt: string
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
    setActiveDragId(String(event.active.id))
  }

  const handleGlobalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (!over) return

    if (over.id === 'today-drop-zone') {
      handleAddToToday(String(active.id))
      return
    }

    // Reorder: dragged a task onto another task
    if (active.id !== over.id) {
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleGlobalDragStart}
      onDragEnd={handleGlobalDragEnd}
    >
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <CategorySidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onAddCategory={() => setAddCategoryOpen(true)}
        onRemoveCategory={handleRemoveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Show empty state if no categories exist */}
          {categories.length === 0 ? (
            <EmptyState onAddCategory={() => setAddCategoryOpen(true)} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats */}
              <Stats tasks={tasks} />

              {/* View Tabs + Add Task Button */}
              <div className="flex items-center gap-3 mb-6">
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
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 mb-6 flex-wrap">
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

              {/* Bento Grid: Task List + Today's Plan */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
                {/* Task List */}
                <div className="min-w-0">
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
                  />
                </div>

                {/* Today's Plan — sticky Bento card */}
                <div className="lg:sticky lg:top-4">
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
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 12px 28px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
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
    </div>
    </DndContext>
  )
}
