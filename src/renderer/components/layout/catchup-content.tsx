import { useMemo } from 'react'
import { Task, Category, SortOption, CompletedTask } from '@/lib/types'
import { TaskBoard } from '@/components/tasks/task-board'
import { DoneToday } from '@/components/tasks/done-today'
import { TodayPanel } from '@/components/today/today-panel'
import { DayTimeline } from '@/components/today/day-timeline'
import { Stats } from '@/components/layout/stats'
import { EmptyState } from '@/components/layout/empty-state'
import { WeeklyPlan, type WeeklyPlanEntry } from '@/components/weekly-plan/weekly-plan'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useTodaySession } from '@/hooks/use-today-session'

export interface CatchupContentProps {
  tasks: Task[]
  categories: Category[]
  sortedTasks: Task[]
  todayTaskIds: string[]
  activeDragId: string | null
  completedToday: CompletedTask[]
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  groupByCategory: boolean
  setGroupByCategory: (value: boolean) => void
  weeklyPlanOpen: boolean
  setWeeklyPlanOpen: (open: boolean) => void
  weeklyRefreshKey: number
  weeklyDayLabels: Record<string, string[]>
  emptyMessage: string
  onAddCategoryOpen: () => void
  onAddTask: () => void
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onUndoComplete: (item: CompletedTask) => void
  onEditTask: (task: Task) => void
  onSaveTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddToToday: (taskId: string) => void
  onRemoveFromToday: (taskId: string) => void
  onCarryOverYesterday?: () => void
  hasYesterdayTasks?: boolean
  onWeeklyEntriesChange: (entries: WeeklyPlanEntry[]) => void
  onOpenTimetable: () => void
  userId?: string
}

export function CatchupContent({
  tasks,
  categories,
  sortedTasks,
  todayTaskIds,
  activeDragId,
  completedToday,
  sortOption,
  setSortOption,
  groupByCategory,
  setGroupByCategory,
  weeklyPlanOpen,
  setWeeklyPlanOpen,
  weeklyRefreshKey,
  weeklyDayLabels,
  emptyMessage,
  onAddCategoryOpen,
  onAddTask,
  onToggleTask,
  onUndoComplete,
  onEditTask,
  onSaveTask,
  onDuplicateTask,
  onDeleteTask,
  onAddToToday,
  onRemoveFromToday,
  onCarryOverYesterday,
  hasYesterdayTasks,
  onWeeklyEntriesChange,
  onOpenTimetable,
  userId,
}: CatchupContentProps) {
  const todayTasks = useMemo(
    () => todayTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[],
    [todayTaskIds, tasks],
  )
  const session = useTodaySession(todayTasks, categories, userId)

  // Show empty state if no categories exist
  if (categories.length === 0) {
    return <EmptyState onAddCategory={onAddCategoryOpen} />
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-7 h-full min-h-0">
      {/* Main column */}
      <div className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-end justify-between gap-4">
          <Stats tasks={tasks} completedTodayCount={completedToday.length} />
          <div className="flex items-center gap-4 pb-5 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group-by-category"
                checked={groupByCategory}
                onCheckedChange={(checked) => setGroupByCategory(checked as boolean)}
              />
              <Label htmlFor="group-by-category" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Group by course
              </Label>
            </div>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-40 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due-date">Sort by due date</SelectItem>
                <SelectItem value="manual">Manual order</SelectItem>
              </SelectContent>
            </Select>
            {/* Next to the list it adds to, so adding several tasks in a row stays in one place */}
            <Button id="add-task-button" onClick={onAddTask} title="Command N" className="rounded-full px-4">
              Add task
            </Button>
          </div>
        </div>

        {/* Weekly plan tab: the week grid sits above the list so tasks can be dragged onto days */}
        <WeeklyPlan
          tasks={tasks}
          categories={categories}
          open={weeklyPlanOpen}
          onOpenChange={setWeeklyPlanOpen}
          onEntriesChange={onWeeklyEntriesChange}
          refreshKey={weeklyRefreshKey}
        />

        <TaskBoard
          tasks={sortedTasks}
          allTaskIds={tasks.map((t) => t.id)}
          categories={categories}
          todayTaskIds={todayTaskIds}
          groupByCategory={groupByCategory}
          session={session}
          weeklyDayLabels={weeklyDayLabels}
          emptyMessage={emptyMessage}
          isDragging={!!activeDragId}
          hasYesterdayTasks={hasYesterdayTasks}
          onCarryOverYesterday={onCarryOverYesterday}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          onSaveTask={onSaveTask}
          onDuplicateTask={onDuplicateTask}
          onDeleteTask={onDeleteTask}
          onAddToToday={onAddToToday}
          onRemoveFromToday={onRemoveFromToday}
        >
          <DoneToday items={completedToday} categories={categories} onUndo={onUndoComplete} />
        </TaskBoard>
      </div>

      {/* Today panel */}
      <TodayPanel tasks={todayTasks} categories={categories} session={session} onToggleTask={onToggleTask}>
        <DayTimeline tasks={todayTasks} categories={categories} session={session} onOpenTimetable={onOpenTimetable} />
      </TodayPanel>
    </div>
  )
}
