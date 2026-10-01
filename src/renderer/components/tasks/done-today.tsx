import type { CompletedTask } from '@/lib/types'
import { formatMinutes } from '@/lib/task-format'

const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** Today's completed tasks, newest first, under the active list. Read-only. */
export function DoneToday({ items }: { items: CompletedTask[] }) {
  if (items.length === 0) return null
  const newestFirst = [...items].sort((a, b) => b.completedAt.localeCompare(a.completedAt))

  return (
    <section aria-label="Done today" className="border-t border-border pt-5">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="font-serif text-xl">Done today</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <ul>
        {newestFirst.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            {/* The complete ring, filled: the same mark the row had when it was ticked */}
            <svg viewBox="0 0 20 20" className="h-5 w-5 flex-shrink-0" aria-hidden>
              <circle cx="10" cy="10" r="8" fill={item.categoryColor} stroke={item.categoryColor} strokeWidth="2" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                {item.taskTitle}
              </p>
              <p className="text-xs text-muted-foreground/80">
                {item.categoryName} · {item.taskType}
                {item.actualTimeSpent ? ` · ${formatMinutes(item.actualTimeSpent)}` : ''}
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{TIME.format(new Date(item.completedAt))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
