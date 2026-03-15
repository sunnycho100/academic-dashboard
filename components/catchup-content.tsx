'use client'

import { Task, Category, SortOption, ViewMode } from '@/lib/types'
import { TaskList } from '@/components/task-list'
import { TodayPanel } from '@/components/today-panel'
import { Stats } from '@/components/stats'
import { EmptyState } from '@/components/empty-state'
import { WeeklyPlan, type WeeklyPlanEntry } from '@/components/weekly-plan'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Plus, CalendarDays } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { viewTransitionVariants } from '@/lib/liquidTransitions'

export interface CatchupContentProps {
  tasks: Task[]
  categories: Category[]
  sortedTasks: Task[]
  todayTaskIds: string[]
  activeDragId: string | null
  completedTodayCount: number
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  groupByCategory: boolean
  setGroupByCategory: (value: boolean) => void
  weeklyPlanOpen: boolean
  setWeeklyPlanOpen: (open: boolean) => void
  weeklyRefreshKey: number
  weeklyDayLabels: Record<string, string[]>
  emptyMessage: string
  onAddTaskOpen: () => void
  onAddCategoryOpen: () => void
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onEditTask: (task: Task) => void
  onSaveTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddToToday: (taskId: string) => void
  onRemoveFromToday: (taskId: string) => void
  onReorderToday: (reorderedIds: string[]) => void
  onWeeklyEntriesChange: (entries: WeeklyPlanEntry[]) => void
  userId?: string
}

export function CatchupContent({
  tasks,
  categories,
  sortedTasks,
  todayTaskIds,
  activeDragId,
  completedTodayCount,
  viewMode,
  setViewMode,
  sortOption,
  setSortOption,
  groupByCategory,
  setGroupByCategory,
  weeklyPlanOpen,
  setWeeklyPlanOpen,
  weeklyRefreshKey,
  weeklyDayLabels,
  emptyMessage,
  onAddTaskOpen,
  onAddCategoryOpen,
  onToggleTask,
  onEditTask,
  onSaveTask,
  onDuplicateTask,
  onDeleteTask,
  onAddToToday,
  onRemoveFromToday,
  onReorderToday,
  onWeeklyEntriesChange,
  userId,
}: CatchupContentProps) {
  // Show empty state if no categories exist
  if (categories.length === 0) {
    return <EmptyState onAddCategory={onAddCategoryOpen} />
  }

  return (
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
        <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
          <Button
            id="add-task-button"
            onClick={onAddTaskOpen}
            className="rounded-lg shadow-sm glass-shimmer-on-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
          <Button
            variant={weeklyPlanOpen ? 'default' : 'glass'}
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
        onEntriesChange={onWeeklyEntriesChange}
        refreshKey={weeklyRefreshKey}
      />

      {/* Bento Grid: Task List + Today's Plan */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          variants={viewTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 flex-1 min-h-0"
        >
        {/* Task List */}
        <div className="min-w-0 min-h-0 flex flex-col overflow-hidden">
          <TaskList
            tasks={sortedTasks}
            categories={categories}
            groupByCategory={groupByCategory}
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onSaveTask={onSaveTask}
            onDuplicateTask={onDuplicateTask}
            onDeleteTask={onDeleteTask}
            onAddToToday={onAddToToday}
            onRemoveFromToday={onRemoveFromToday}
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
            onRemoveFromToday={onRemoveFromToday}
            onToggleTask={onToggleTask}
            onReorderToday={onReorderToday}
            isDragging={!!activeDragId}
            userId={userId}
          />
        </div>
      </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
