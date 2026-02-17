'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Task, Category } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  GripVertical,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

export interface WeeklyPlanEntry {
  id: string
  taskId: string
  date: string
  task: Task & { category: Category }
}

interface WeeklyPlanProps {
  tasks: Task[]
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntriesChange?: (entries: WeeklyPlanEntry[]) => void
  refreshKey?: number
}

// ── Helpers ────────────────────────────────────────────────────────

/** Get Monday of the current week (ISO week) */
export function getWeekStart(d: Date = new Date()): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  date.setDate(date.getDate() + diff)
  return date
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatShortDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

// ── Component ──────────────────────────────────────────────────────

export function WeeklyPlan({ tasks, categories, open, onOpenChange, onEntriesChange, refreshKey }: WeeklyPlanProps) {
  const [entries, setEntries] = useState<WeeklyPlanEntry[]>([])
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, 1 = next, -1 = prev
  const [loading, setLoading] = useState(false)
  const [addingDay, setAddingDay] = useState<string | null>(null) // dateKey of day whose popover is open

  // Compute the 7 dates for the current viewed week
  const weekDates = useMemo(() => {
    const monday = getWeekStart()
    monday.setDate(monday.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [weekOffset])

  const weekStartKey = formatDateKey(weekDates[0])

  // Fetch entries when panel opens or week changes
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-plan?weekStart=${weekStartKey}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setEntries(data)
        onEntriesChange?.(data)
      }
    } catch (err) {
      console.error('Failed to fetch weekly plan:', err)
    } finally {
      setLoading(false)
    }
  }, [weekStartKey, onEntriesChange])

  useEffect(() => {
    // Fetch on mount (even if closed) so task-row badges are populated
    fetchEntries()
  }, [fetchEntries, refreshKey])

  // Add task to a day
  const addEntry = async (taskId: string, dateKey: string) => {
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, date: dateKey }),
      })
      if (res.ok) {
        const entry = await res.json()
        const updated = [...entries, entry]
        setEntries(updated)
        onEntriesChange?.(updated)
      }
    } catch (err) {
      console.error('Failed to add weekly plan entry:', err)
    }
    setAddingDay(null)
  }

  // Remove entry
  const removeEntry = async (entryId: string) => {
    const updated = entries.filter((e) => e.id !== entryId)
    setEntries(updated)
    onEntriesChange?.(updated)
    try {
      await fetch('/api/weekly-plan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      })
    } catch (err) {
      console.error('Failed to remove weekly plan entry:', err)
    }
  }

  // Group entries by date key
  const entriesByDate = useMemo(() => {
    const map: Record<string, WeeklyPlanEntry[]> = {}
    for (const d of weekDates) {
      map[formatDateKey(d)] = []
    }
    for (const entry of entries) {
      const key = String(entry.date).slice(0, 10)
      if (map[key]) map[key].push(entry)
    }
    return map
  }, [entries, weekDates])

  // Tasks already assigned this week (to avoid duplicates on same day)
  const assignedTaskIdsByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const [dateKey, dayEntries] of Object.entries(entriesByDate)) {
      map[dateKey] = new Set(dayEntries.map((e) => e.taskId))
    }
    return map
  }, [entriesByDate])

  // Today's dateKey for highlighting
  const todayKey = formatDateKey(new Date())

  // Week range label
  const weekLabel = `${formatShortDate(weekDates[0])} — ${formatShortDate(weekDates[6])}`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="overflow-hidden"
        >
          <motion.div
            layout
            className="relative rounded-2xl overflow-hidden glass-thin glass-rim mb-6"
          >
            {/* Header */}
            <div className="relative z-10 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    className="h-7 w-7 rounded-xl bg-violet-500/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
                  </motion.div>
                  <h2 className="font-semibold text-sm tracking-tight">Weekly Plan</h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Week navigation */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      onClick={() => setWeekOffset((w) => w - 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                    </Button>
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5"
                    >
                      {weekLabel}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      onClick={() => setWeekOffset((w) => w + 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </Button>
                  </div>

                  {/* Collapse */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md"
                    onClick={() => onOpenChange(false)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mx-4 border-t border-white/10" />

            {/* 7-day grid */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, idx) => {
                  const dateKey = formatDateKey(date)
                  const isToday = dateKey === todayKey
                  const dayEntries = entriesByDate[dateKey] || []
                  const assignedIds = assignedTaskIdsByDate[dateKey] || new Set()
                  const availableTasks = tasks.filter((t) => !assignedIds.has(t.id))

                  return (
                    <DroppableDayColumn key={dateKey} dateKey={dateKey} isToday={isToday}>
                      {/* Day header */}
                      <div className={cn(
                        'px-2.5 py-1.5 flex items-center justify-between border-b',
                        isToday ? 'border-violet-500/20' : 'border-white/10',
                      )}>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'text-[11px] font-semibold uppercase tracking-wider',
                            isToday ? 'text-violet-500' : 'text-muted-foreground/70',
                          )}>
                            {DAY_LABELS[idx]}
                          </span>
                          <span className={cn(
                            'text-[10px] tabular-nums',
                            isToday ? 'text-violet-500/70' : 'text-muted-foreground/40',
                          )}>
                            {date.getDate()}
                          </span>
                        </div>
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        )}
                      </div>

                      {/* Task list for this day */}
                      <div className="flex-1 px-1.5 py-1.5 space-y-1 overflow-y-auto max-h-[112px]">
                        <AnimatePresence mode="popLayout">
                          {dayEntries.map((entry) => {
                            const cat = entry.task?.category
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="group relative flex items-start gap-1 rounded-lg px-1.5 py-1 hover:bg-muted/40 transition-colors"
                              >
                                {cat && (
                                  <div
                                    className="w-1 h-full min-h-[20px] rounded-full flex-shrink-0 mt-0.5"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                )}
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[11px] font-medium leading-tight truncate text-foreground/90">
                                    {entry.task?.title ?? 'Unknown'}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground/50 truncate">
                                    {cat?.name ?? ''}{entry.task?.type ? ` · ${entry.task.type}` : ''}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeEntry(entry.id)}
                                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Add task button */}
                      <div className="px-1.5 pb-1.5">
                        <Popover
                          open={addingDay === dateKey}
                          onOpenChange={(o) => setAddingDay(o ? dateKey : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                'w-full flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors',
                                'text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/40',
                              )}
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-64 p-0"
                            side="bottom"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Search tasks..." className="text-xs" />
                              <CommandList>
                                <CommandEmpty className="text-xs text-center py-4 text-muted-foreground">
                                  No tasks available
                                </CommandEmpty>
                                {categories.map((cat) => {
                                  const catTasks = availableTasks.filter((t) => t.categoryId === cat.id)
                                  if (catTasks.length === 0) return null
                                  return (
                                    <CommandGroup
                                      key={cat.id}
                                      heading={
                                        <span className="flex items-center gap-1.5">
                                          <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: cat.color }}
                                          />
                                          {cat.name}
                                        </span>
                                      }
                                    >
                                      {catTasks.map((task) => (
                                        <CommandItem
                                          key={task.id}
                                          value={`${task.title} ${cat.name}`}
                                          onSelect={() => addEntry(task.id, dateKey)}
                                          className="text-xs cursor-pointer"
                                        >
                                          <span className="truncate">{task.title}</span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-auto text-[9px] px-1 py-0 font-normal"
                                          >
                                            {task.type}
                                          </Badge>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )
                                })}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </DroppableDayColumn>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Droppable Day Column ───────────────────────────────────────────

function DroppableDayColumn({
  dateKey,
  isToday,
  children,
}: {
  dateKey: string
  isToday: boolean
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `weekly-day-${dateKey}` })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border transition-colors min-h-[140px] flex flex-col',
        isToday
          ? 'border-violet-500/40 bg-violet-500/5'
          : 'border-white/10 bg-white/5 hover:bg-white/8',
        isOver && 'ring-2 ring-violet-500/40 bg-violet-500/10',
      )}
    >
      {children}
    </div>
  )
}
