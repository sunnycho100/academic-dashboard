import { useEffect, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseDue } from '@/lib/parse-due'
import { cn } from '@/lib/utils'

/** yyyy-mm-dd in local time */
const toValue = (d: Date) => format(d, 'yyyy-MM-dd')
const fromValue = (v: string) => (v ? new Date(v + 'T00:00:00') : null)

/** "Today", "Tomorrow", "Fri, Oct 2" within the week, else "Mon, Oct 12" */
export function dueText(d: Date, now = new Date()): string {
  const days = differenceInCalendarDays(d, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return format(d, d.getFullYear() === now.getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}

interface DueDatePickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Due date control: a button showing the date in words, opening a popover with a
 * type-a-date field (like Todoist and Linear) above a month grid.
 */
export function DueDatePicker({ id, value, onChange, className }: DueDatePickerProps) {
  const selected = fromValue(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [cursor, setCursor] = useState<Date>(selected ?? today)
  const gridRef = useRef<HTMLDivElement>(null)
  const typedDate = parseDue(typed)

  // Each open starts from the current value
  useEffect(() => {
    if (open) {
      setTyped('')
      setCursor(fromValue(value) ?? new Date())
    }
  }, [open, value])

  const pick = (d: Date | null) => {
    onChange(d ? toValue(d) : '')
    setOpen(false)
  }

  const monthStart = startOfMonth(cursor)
  const gridStart = startOfWeek(monthStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  // Arrow keys move a day or a week, Page keys a month; focus follows the cursor
  const moveCursor = (next: Date) => {
    setCursor(next)
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>('[data-cursor="true"]')?.focus())
  }
  const onGridKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (step) {
      e.preventDefault()
      moveCursor(addDays(cursor, step))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      moveCursor(addMonths(cursor, e.key === 'PageUp' ? -1 : 1))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-9 w-full items-center rounded-md border border-input px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          {selected ? dueText(selected) : 'No due date'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[272px] p-3">
        <input
          autoFocus
          aria-label="Type a date"
          placeholder="Type a date, like fri or oct 5"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (typedDate) pick(typedDate)
            }
          }}
          className="w-full border-b border-border bg-transparent pb-2 text-sm placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none focus-visible:[box-shadow:none]"
        />
        <p className="mt-1.5 h-4 text-xs text-muted-foreground" aria-live="polite">
          {typed && (typedDate ? `${dueText(typedDate)}, press Return` : 'Not a date yet')}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-medium">{format(cursor, 'MMMM yyyy')}</span>
          <div className="flex">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(addMonths(cursor, -1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted-foreground" aria-hidden>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div ref={gridRef} role="grid" aria-label={format(cursor, 'MMMM yyyy')} onKeyDown={onGridKey} className="mt-1 grid grid-cols-7 gap-y-0.5">
          {days.map((d) => {
            const isSelected = selected !== null && isSameDay(d, selected)
            const isToday = isSameDay(d, today)
            const isCursor = isSameDay(d, cursor)
            return (
              <button
                key={d.toISOString()}
                type="button"
                role="gridcell"
                aria-label={format(d, 'EEEE, MMMM d, yyyy')}
                aria-selected={isSelected}
                tabIndex={isCursor ? 0 : -1}
                data-cursor={isCursor}
                onClick={() => pick(d)}
                className={cn(
                  'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  !isSameMonth(d, cursor) && 'text-muted-foreground/50',
                  isToday && !isSelected && 'font-semibold text-coral',
                  isSelected ? 'bg-foreground text-background' : 'hover:bg-secondary',
                )}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs">
          <button type="button" onClick={() => pick(null)} className="text-muted-foreground hover:text-foreground">
            No date
          </button>
          <button type="button" onClick={() => pick(today)} className="text-muted-foreground hover:text-foreground">
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
