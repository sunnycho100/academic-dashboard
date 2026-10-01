import type { Category, CompletedTask } from '@/lib/types'
import { formatMinutes } from '@/lib/task-format'

const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

interface DoneTodayProps {
  items: CompletedTask[]
  categories: Category[]
  onUndo: (item: CompletedTask) => void
}

/** Today's completed tasks, newest first, under the active list. Undo puts one back. */
export function DoneToday({ items, categories, onUndo }: DoneTodayProps) {
  if (items.length === 0) return null
  const newestFirst = [...items].sort((a, b) => b.completedAt.localeCompare(a.completedAt))

  return (
    <section aria-label="Done today" className="border-t border-border pt-5">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="font-serif text-xl">Done today</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <ul>
        {newestFirst.map((item) => {
          // Undo needs the course to still exist, and the record to be saved (real id)
          const canUndo = categories.some((c) => c.name === item.categoryName) && !item.id.startsWith('local-')
          return (
            <li key={item.id} className="group/done flex items-center gap-3 rounded-md px-3 py-2 hover:bg-secondary/60">
              {/* The filled complete ring; clicking it un-ticks, like the ring on an active row */}
              <button
                type="button"
                role="checkbox"
                aria-checked
                aria-label={`Undo ${item.taskTitle}`}
                disabled={!canUndo}
                onClick={() => onUndo(item)}
                className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                  <circle cx="10" cy="10" r="8" fill={item.categoryColor} stroke={item.categoryColor} strokeWidth="2" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                  {item.taskTitle}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {item.categoryName} · {item.taskType}
                  {item.actualTimeSpent ? ` · ${formatMinutes(item.actualTimeSpent)}` : ''}
                </p>
              </div>
              {canUndo && (
                <button
                  type="button"
                  onClick={() => onUndo(item)}
                  className="text-xs text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover/done:opacity-100"
                >
                  Undo
                </button>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">{TIME.format(new Date(item.completedAt))}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
