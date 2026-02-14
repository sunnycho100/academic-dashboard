'use client'

import { useState, useEffect } from 'react'
import { Task, Category, SortOption, ViewMode, TaskType } from '@/lib/types'
import { loadState, saveState } from '@/lib/store'
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    const state = loadState()
    setCategories(state.categories)
    setTasks(state.tasks)
    setTodayTaskIds(loadTodayIds())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      saveState({ categories, tasks })
    }
  }, [categories, tasks, mounted])

  useEffect(() => {
    if (mounted) {
      saveTodayIds(todayTaskIds)
    }
  }, [todayTaskIds, mounted])

  const handleAddCategory = (name: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      order: categories.length,
    }
    setCategories([...categories, newCategory])
  }

  const handleAddTask = (taskData: {
    title: string
    categoryId: string
    type: TaskType
    dueAt: string
    notes?: string
    estimatedDuration?: number
  }) => {
    const newTask: Task = {
      id: Date.now().toString(),
      ...taskData,
      status: 'todo',
      priorityOrder: tasks.length,
      createdAt: new Date().toISOString(),
    }
    setTasks([...tasks, newTask])
  }

  const handleToggleTask = (id: string, timeSpentSeconds?: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const isCompletingTask = task.status === 'todo'
    const actualMinutes =
      timeSpentSeconds !== undefined ? Math.round(timeSpentSeconds / 60) : undefined

    setTasks(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === 'done' ? 'todo' : 'done',
              ...(isCompletingTask && actualMinutes !== undefined
                ? { actualTimeSpent: actualMinutes }
                : {}),
            }
          : t
      )
    )

    // Persist to PostgreSQL when completing a task
    if (isCompletingTask) {
      const category = categories.find((c) => c.id === task.categoryId)
      fetch('/api/completed-tasks', {
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
      }).catch((err) => console.error('Failed to persist completed task:', err))
    }
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setEditTaskOpen(true)
  }

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(
      tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    )
  }

  const handleDuplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      title: `${task.title} (Copy)`,
      status: 'todo',
      priorityOrder: tasks.length,
      createdAt: new Date().toISOString(),
    }
    setTasks([...tasks, newTask])
  }

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
    setTodayTaskIds(todayTaskIds.filter((tid) => tid !== id))
  }

  const handleRemoveCategory = (categoryId: string) => {
    const removedTaskIds = tasks.filter((t) => t.categoryId === categoryId).map((t) => t.id)
    setCategories(categories.filter((c) => c.id !== categoryId))
    setTasks(tasks.filter((t) => t.categoryId !== categoryId))
    setTodayTaskIds(todayTaskIds.filter((id) => !removedTaskIds.includes(id)))
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null)
    }
  }

  const handleAddToToday = (taskId: string) => {
    if (!todayTaskIds.includes(taskId)) {
      setTodayTaskIds([...todayTaskIds, taskId])
    }
  }

  const handleRemoveFromToday = (taskId: string) => {
    setTodayTaskIds(todayTaskIds.filter((id) => id !== taskId))
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
    localStorage.removeItem('class-catchup-data')
    setClearDataOpen(false)
  }

  const handleImportData = (data: { categories: Category[]; tasks: Task[] }) => {
    setCategories(data.categories)
    setTasks(data.tasks)
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
      return dueDate >= today
    } else {
      return dueDate < today
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
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-stretch">
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
                <div className="lg:self-stretch">
                  <TodayPanel
                    tasks={todayTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[]}
                    allTasks={tasks}
                    categories={categories}
                    onRemoveFromToday={handleRemoveFromToday}
                    onToggleTask={handleToggleTask}
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
