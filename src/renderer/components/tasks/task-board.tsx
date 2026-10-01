import type { Task, Category } from '@/lib/types'
import type { TodaySession } from '@/hooks/use-today-session'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { TaskRow } from '@/components/tasks/task-row'
import { TodayTaskRow } from '@/components/today/today-task-row'
import { useFreshTaskIds } from '@/components/tasks/course-ring'
import { groupTasksByTime } from '@/lib/task-groups'

interface TaskBoardProps {
  tasks: Task[]
  allTaskIds: string[]
  categories: Category[]
  todayTaskIds: string[]
  groupByCategory: boolean
  session: TodaySession
  weeklyDayLabels: Record<string, string[]>
  emptyMessage: string
  /** Rendered at the end of the scrolling list (the Done today section) */
  children?: React.ReactNode
  isDragging: boolean
  hasYesterdayTasks?: boolean
  onCarryOverYesterday?: () => void
  onToggleTask: (id: string, timeSpentSeconds?: number) => void
  onEditTask: (task: Task) => void
  onSaveTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddToToday: (id: string) => void
  onRemoveFromToday: (id: string) => void
}

function GroupHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h2 className="font-serif text-xl">{title}</h2>
      <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
    </div>
  )
}

/** The main task column: Today (the plan, with timers), then Overdue and Upcoming, or course groups. */
export function TaskBoard(props: TaskBoardProps) {
  const { tasks, allTaskIds, categories, todayTaskIds, groupByCategory, session, isDragging } = props
  const { today, overdue, dueToday, upcoming } = groupTasksByTime(tasks, todayTaskIds)
  const fresh = useFreshTaskIds(allTaskIds)
  const { isOver, setNodeRef } = useDroppable({ id: 'today-drop-zone' })
  const categoryOf = (id: string) => categories.find((c) => c.id === id)

  // Ring draw-in stagger follows on-screen order
  let slot = 0
  const drawIndex = (id: string) => (fresh.has(id) ? slot++ : null)

  const renderRows = (list: Task[]) => (
    <SortableContext items={list.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-1.5">
        {list.map((task) => {
          const category = categoryOf(task.categoryId)
          if (!category) return null
          return (
            <TaskRow
              key={task.id}
              task={task}
              category={category}
              drawIndex={drawIndex(task.id)}
              onToggle={props.onToggleTask}
              onEdit={props.onEditTask}
              onSave={props.onSaveTask}
              onDuplicate={props.onDuplicateTask}
              onDelete={props.onDeleteTask}
              onAddToToday={props.onAddToToday}
              weeklyDayLabels={props.weeklyDayLabels[task.id]}
            />
          )
        })}
      </div>
    </SortableContext>
  )

  const rest = [...overdue, ...dueToday, ...upcoming]
  const courseGroups = categories
    .map((category) => ({ category, list: rest.filter((t) => t.categoryId === category.id) }))
    .filter((g) => g.list.length > 0)

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="pr-3 pb-8 space-y-6">
        {/* Today: drop target for adding to the plan */}
        <section
          ref={setNodeRef}
          aria-label="Today"
          className={cn('rounded-2xl transition-colors', (isOver || isDragging) && 'bg-today/[0.04] outline-dashed outline-1 outline-today/30 outline-offset-4')}
        >
          <GroupHeading title="Today" count={today.length} />
          {today.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground flex items-center justify-between gap-3">
              <span>{isOver ? 'Release to add to today' : 'Drag tasks here, or use the arrow on a task.'}</span>
              {props.hasYesterdayTasks && props.onCarryOverYesterday && (
                <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={props.onCarryOverYesterday}>
                  <History className="h-3.5 w-3.5" />
                  Carry over yesterday
                </Button>
              )}
            </div>
          ) : (
            <SortableContext items={today.map((t) => `today-${t.id}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {today.map((task) => (
                  <TodayTaskRow
                    key={task.id}
                    task={task}
                    category={categoryOf(task.categoryId)}
                    session={session}
                    drawIndex={drawIndex(task.id)}
                    onToggleTask={props.onToggleTask}
                    onRemoveFromToday={props.onRemoveFromToday}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </section>

        {rest.length === 0 && today.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{props.emptyMessage}</p>
        ) : groupByCategory ? (
          courseGroups.map(({ category, list }) => (
            <section key={category.id} aria-label={category.name}>
              <GroupHeading title={category.name} count={list.length} />
              {renderRows(list)}
            </section>
          ))
        ) : (
          <>
            {overdue.length > 0 && (
              <section aria-label="Overdue">
                <GroupHeading title="Overdue" count={overdue.length} />
                {renderRows(overdue)}
              </section>
            )}
            {dueToday.length > 0 && (
              <section aria-label="Due today">
                <GroupHeading title="Due today" count={dueToday.length} />
                {renderRows(dueToday)}
              </section>
            )}
            {upcoming.length > 0 && (
              <section aria-label="Upcoming">
                <GroupHeading title="Upcoming" count={upcoming.length} />
                {renderRows(upcoming)}
              </section>
            )}
          </>
        )}
        {props.children}
      </div>
    </ScrollArea>
  )
}
