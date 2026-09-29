export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

/** Short due label for a task row: "2d late", "Today", "Tomorrow", "Thu" (this week), "Oct 20". */
export function dueLabel(dueAt: string | null, now = new Date()): { text: string; late: boolean } | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(due) - day(now)) / 86_400_000)
  if (days < 0) return { text: `${-days}d late`, late: true }
  if (days === 0) return { text: 'Today', late: false }
  if (days === 1) return { text: 'Tomorrow', late: false }
  if (days < 7) return { text: WEEKDAY.format(due), late: false }
  return { text: MONTH_DAY.format(due), late: false }
}

/** Timer display, always H:MM:SS (the focus timer's big digits). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** One-line sidebar summary for a course: "1 overdue", "3 due · next Fri", or "Nothing due". */
export function courseSummary(tasks: { dueAt: string | null }[], now = new Date()): string {
  const labels = tasks.map((t) => dueLabel(t.dueAt, now)).filter((d) => d !== null)
  const late = labels.filter((d) => d.late).length
  if (late > 0) return `${late} overdue`
  const dated = tasks.filter((t) => t.dueAt).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
  if (dated.length === 0) return 'Nothing due'
  const next = dueLabel(dated[0].dueAt, now)!.text
  const when = next === 'Today' || next === 'Tomorrow' ? next.toLowerCase() : `next ${next}`
  return `${dated.length} due · ${when}`
}
