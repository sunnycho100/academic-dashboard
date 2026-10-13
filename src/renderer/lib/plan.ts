// Planning on the day timeline: tasks dropped on the Planned lane become Timetable entries,
// so the Timetable tab and the timeline always show the same plan.

export const HOUR_PX = 64

/** Minute of the day under a point in the lane, snapped to 15 minutes. */
export function minuteAt(y: number, startHour: number): number {
  return Math.max(0, Math.round((startHour * 60 + (y / HOUR_PX) * 60) / 15) * 15)
}

/** "HH:MM" for a minute of the day; past midnight wraps (25:30 is 01:30). */
export function hhmm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

type Entry = {
  id?: string
  order: number
  plannedStart: string
  plannedEnd: string
  expectedMinutes: number
  activityName: string
  actualStart: string | null
  actualEnd: string | null
  actualMinutes: number | null
  notes: string
}

/** Read a day's Timetable, change it, and save it back; the timeline reloads on the event. */
async function editDay(date: string, change: (entries: Entry[]) => Entry[]) {
  const rows: Entry[] = await fetch(`/api/timetable?date=${date}`).then((r) => r.json())
  // Drop the Timetable's blank padding rows, then keep the plan in time order
  const filled = (Array.isArray(rows) ? rows : []).filter((e) => e.activityName || e.plannedStart || e.plannedEnd || e.actualStart || e.actualEnd)
  const entries = change(filled)
    .sort((a, b) => (a.plannedStart || '99:99').localeCompare(b.plannedStart || '99:99'))
    .map((e, order) => ({ ...e, order }))
  await fetch('/api/timetable', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, entries }),
  })
  window.dispatchEvent(new Event('timetable-changed'))
}

export function addPlanned(date: string, title: string, startMin: number, minutes: number) {
  return editDay(date, (entries) => [
    ...entries,
    {
      order: 0,
      plannedStart: hhmm(startMin),
      plannedEnd: hhmm(startMin + minutes),
      expectedMinutes: minutes,
      activityName: title,
      actualStart: null,
      actualEnd: null,
      actualMinutes: null,
      notes: '',
    },
  ])
}

export function movePlanned(date: string, id: string, startMin: number) {
  return editDay(date, (entries) =>
    entries.map((e) => (e.id === id ? { ...e, plannedStart: hhmm(startMin), plannedEnd: hhmm(startMin + e.expectedMinutes) } : e)),
  )
}

export function removePlanned(date: string, id: string) {
  return editDay(date, (entries) => entries.filter((e) => e.id !== id))
}

// Where the pointer is during a drag. dnd-kit's delta is measured against the scroll position
// of the list the drag started in, which is off once the pointer is over the timeline.
const pointer = { y: 0 }
if (typeof window !== 'undefined') window.addEventListener('pointermove', (e) => (pointer.y = e.clientY), { capture: true, passive: true })

/**
 * Where a drag over the Planned lane lands. A planned block moves by how far it was dragged
 * (so it doesn't jump to the pointer); a task starts at the pointer.
 */
export function dropStart(
  e: { delta: { y: number }; active: { data: { current?: Record<string, unknown> } } },
  startHour: number,
  laneTop: number,
): number {
  const from = e.active.data.current?.startMin
  if (typeof from === 'number') return Math.max(0, from + Math.round((e.delta.y / HOUR_PX) * 4) * 15)
  return minuteAt(pointer.y - laneTop, startHour)
}

/** How long a dragged task takes on the plan (its estimate, or an hour) and its name. */
export function planMinutes(tasks: { id: string; estimatedDuration?: number | null }[], activeId: string): number {
  const id = activeId.startsWith('today-') ? activeId.slice(6) : activeId
  return tasks.find((t) => t.id === id)?.estimatedDuration || 60
}

export function planTitle(tasks: { id: string; title: string }[], activeId: string): string {
  const id = activeId.startsWith('today-') ? activeId.slice(6) : activeId
  return tasks.find((t) => t.id === id)?.title ?? ''
}
