import { useState, useEffect, useCallback, useRef } from 'react'
import { TimetableEntry } from '@/lib/types'
import {
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'

// ---------------------------------------------------------------------------
// Helpers (exported for use by TimetableRow and Timetable components)
// ---------------------------------------------------------------------------

/** Format "YYYY-MM-DD" from a Date (local timezone). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse "HH:mm" and return total minutes since midnight, or null. */
export function parseTime(t: string | null | undefined): number | null {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Diff in minutes between two "HH:mm" strings (handles overnight). */
export function diffMinutes(start: string, end: string): number {
  const s = parseTime(start)
  const e = parseTime(end)
  if (s === null || e === null) return 0
  let diff = e - s
  if (diff < 0) diff += 24 * 60 // across midnight
  return diff
}

/** Format minutes as "Xh Ym". */
export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Describe variance from expected. */
export function varianceNote(expected: number, actual: number | null): string {
  if (actual === null || expected === 0) return ''
  const diff = actual - expected
  if (diff === 0) return 'On time'
  if (diff > 0) return `+${fmtDuration(diff)} over`
  return `${fmtDuration(Math.abs(diff))} under`
}

/** Pretty date display. */
export function prettyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const todayStr = toDateStr(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrow)

  const label = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  if (dateStr === todayStr) return `Today — ${label}`
  if (dateStr === tomorrowStr) return `Tomorrow — ${label}`
  return label
}

/** Round minutes up to the nearest 5. */
export function roundUp5(minutes: number): number {
  return Math.ceil(minutes / 5) * 5
}

/** Format total minutes since midnight as "HH:mm" (wraps at 24h). */
export function minutesToHHmm(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Determine a smart autofill time for a row's plannedStart.
 *
 * Logic:
 *  1. If the previous row has a plannedEnd, use that (sequential flow).
 *  2. Otherwise, use current time rounded up to the nearest 5 minutes.
 */
export function getAutofillTime(entries: TimetableEntry[], rowIndex: number): string {
  for (let i = rowIndex - 1; i >= 0; i--) {
    if (entries[i].plannedEnd) return entries[i].plannedEnd
  }
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return minutesToHHmm(roundUp5(currentMinutes))
}

/**
 * Return an AM/PM-matched placeholder for the end time field.
 * Copies the start time's half-day (AM/PM) so the user only needs to
 * adjust hours and minutes. Returns "12:00" (PM) or "00:00" (AM) based
 * on the start time.
 */
export function getEndTimeAmPmDefault(startTime: string): string | null {
  const mins = parseTime(startTime)
  if (mins === null) return null
  // 720 minutes = 12:00 (noon). >= 720 means PM.
  return mins >= 720 ? '12:00' : '00:00'
}

// ---------------------------------------------------------------------------
// Blank row factory
// ---------------------------------------------------------------------------

export const DEFAULT_ROW_COUNT = 20

export function blankEntry(date: string, order: number): TimetableEntry {
  return {
    id: crypto.randomUUID(),
    userId: '',
    date,
    order,
    plannedStart: '',
    plannedEnd: '',
    expectedMinutes: 0,
    activityName: '',
    actualStart: null,
    actualEnd: null,
    actualMinutes: null,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Pad entries array up to DEFAULT_ROW_COUNT with blank rows. */
export function padEntries(entries: TimetableEntry[], date: string): TimetableEntry[] {
  if (entries.length >= DEFAULT_ROW_COUNT) return entries
  const padded = [...entries]
  for (let i = entries.length; i < DEFAULT_ROW_COUNT; i++) {
    padded.push(blankEntry(date, i))
  }
  return padded
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimetableLogic() {
  const [date, setDate] = useState<string>(toDateStr(new Date()))
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [autofill, setAutofill] = useState(true)
  const [autopush, setAutopush] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const autopushRef = useRef(autopush)
  autopushRef.current = autopush
  const dateRef = useRef(date)
  dateRef.current = date

  // ── Fetch entries for the current date ──────────────────────────────────
  const fetchEntries = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/timetable?date=${d}`)
      if (!res.ok) throw new Error('fetch failed')
      const data: TimetableEntry[] = await res.json()
      setEntries(padEntries(data, d))
    } catch {
      setEntries(padEntries([], d))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(date)
  }, [date, fetchEntries])

  // ── Auto-save (debounced) ───────────────────────────────────────────────
  const persist = useCallback(async () => {
    const current = entriesRef.current
    const d = dateRef.current
    if (current.length === 0) return

    try {
      await fetch('/api/timetable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: d, entries: current }),
      })
    } catch (err) {
      console.error('Failed to save timetable:', err)
    }
  }, [])

  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(persist, 600)
  }, [persist])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      persist()
    }
  }, [persist])

  // ── Mutations ───────────────────────────────────────────────────────────
  const updateEntry = useCallback(
    (id: string, patch: Partial<TimetableEntry>) => {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id)
        if (idx === -1) return prev

        const next = prev.map((e) => {
          if (e.id !== id) return e
          const updated = { ...e, ...patch, updatedAt: new Date().toISOString() }

          // Auto-compute expected minutes
          if (patch.plannedStart !== undefined || patch.plannedEnd !== undefined) {
            const s = patch.plannedStart ?? e.plannedStart
            const end = patch.plannedEnd ?? e.plannedEnd
            updated.expectedMinutes = diffMinutes(s, end)
          }

          // Auto-compute actual duration
          if (patch.actualStart !== undefined || patch.actualEnd !== undefined) {
            const s = patch.actualStart !== undefined ? patch.actualStart : e.actualStart
            const end = patch.actualEnd !== undefined ? patch.actualEnd : e.actualEnd
            if (s && end) {
              updated.actualMinutes = diffMinutes(s, end)
            }
          }

          // Auto-generate notes
          if (updated.expectedMinutes > 0 && updated.actualMinutes !== null) {
            updated.notes = varianceNote(updated.expectedMinutes, updated.actualMinutes)
          }

          return updated
        })

        // Autopush: when actualStart changes on a row that already has actualEnd,
        // cascade planned times for subsequent incomplete rows
        if (autopushRef.current && patch.actualStart !== undefined) {
          const row = next[idx]
          const endTime = row.actualEnd
          if (endTime) {
            let cursor = endTime
            for (let i = idx + 1; i < next.length; i++) {
              const r = next[i]
              if (!r.plannedStart && !r.plannedEnd && !r.activityName) break
              if (r.actualEnd) { cursor = r.actualEnd; continue }

              const updated = { ...r }
              const dur =
                updated.expectedMinutes > 0
                  ? updated.expectedMinutes
                  : updated.plannedStart && updated.plannedEnd
                    ? diffMinutes(updated.plannedStart, updated.plannedEnd)
                    : 0

              updated.plannedStart = cursor
              if (dur > 0) {
                const startMin = parseTime(cursor)
                if (startMin !== null) {
                  updated.plannedEnd = minutesToHHmm(startMin + dur)
                  updated.expectedMinutes = dur
                }
              }
              updated.updatedAt = new Date().toISOString()
              next[i] = updated
              cursor = updated.plannedEnd || cursor
            }
          }
        }

        // Autopush: when plannedEnd changes on an incomplete row (no actualEnd),
        // cascade planned times for subsequent rows so the schedule stays aligned
        if (autopushRef.current && patch.plannedEnd !== undefined && !next[idx].actualEnd) {
          const newEnd = patch.plannedEnd
          if (newEnd) {
            let cursor = newEnd
            for (let i = idx + 1; i < next.length; i++) {
              const r = next[i]
              if (!r.plannedStart && !r.plannedEnd && !r.activityName) break
              if (r.actualEnd) { cursor = r.actualEnd; continue }

              const updated = { ...r }
              const dur =
                updated.expectedMinutes > 0
                  ? updated.expectedMinutes
                  : updated.plannedStart && updated.plannedEnd
                    ? diffMinutes(updated.plannedStart, updated.plannedEnd)
                    : 0

              updated.plannedStart = cursor
              if (dur > 0) {
                const startMin = parseTime(cursor)
                if (startMin !== null) {
                  updated.plannedEnd = minutesToHHmm(startMin + dur)
                  updated.expectedMinutes = dur
                }
              }
              updated.updatedAt = new Date().toISOString()
              next[i] = updated
              cursor = updated.plannedEnd || cursor
            }
          }
        }

        return next
      })
      debouncedSave()
    },
    [debouncedSave],
  )

  // ── Autopush: cascade planned times when actual end changes ─────────
  const handleActualEndChange = useCallback(
    (id: string, newActualEnd: string | null) => {
      // Capture previous entry before state update (for duplicate prevention)
      const prevEntry = entriesRef.current.find((e) => e.id === id)

      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id)
        if (idx === -1) return prev

        const next = [...prev]

        // Update the target row
        const target = { ...next[idx], actualEnd: newActualEnd, updatedAt: new Date().toISOString() }
        const actualS = target.actualStart
        if (actualS && newActualEnd) {
          target.actualMinutes = diffMinutes(actualS, newActualEnd)
        } else {
          target.actualMinutes = null
        }
        if (target.expectedMinutes > 0 && target.actualMinutes !== null) {
          target.notes = varianceNote(target.expectedMinutes, target.actualMinutes)
        } else if (!newActualEnd) {
          target.notes = ''
        }
        next[idx] = target

        // Autopush: cascade planned times for subsequent incomplete rows
        if (autopushRef.current && newActualEnd) {
          let cursor = newActualEnd
          for (let i = idx + 1; i < next.length; i++) {
            const row = next[i]
            if (!row.plannedStart && !row.plannedEnd && !row.activityName) break
            if (row.actualEnd) continue

            const updated = { ...row }
            const dur =
              updated.expectedMinutes > 0
                ? updated.expectedMinutes
                : updated.plannedStart && updated.plannedEnd
                  ? diffMinutes(updated.plannedStart, updated.plannedEnd)
                  : 0

            updated.plannedStart = cursor
            if (dur > 0) {
              const startMin = parseTime(cursor)
              if (startMin !== null) {
                updated.plannedEnd = minutesToHHmm(startMin + dur)
                updated.expectedMinutes = dur
              }
            }
            updated.updatedAt = new Date().toISOString()
            next[i] = updated
            cursor = updated.plannedEnd || cursor
          }
        }

        return next
      })
      debouncedSave()

      // Create a time record when actualEnd is first set
      if (
        prevEntry &&
        newActualEnd &&
        prevEntry.actualStart &&
        prevEntry.activityName &&
        !prevEntry.actualEnd // only on first completion, not edits
      ) {
        const durationMin = diffMinutes(prevEntry.actualStart, newActualEnd)
        const d = dateRef.current
        const startTime = new Date(`${d}T${prevEntry.actualStart}:00`)
        const endTime = new Date(`${d}T${newActualEnd}:00`)
        // Handle overnight: if end < start, advance end by one day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1)
        }

        fetch('/api/time-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: null,
            taskTitle: prevEntry.activityName,
            categoryName: 'Timetable',
            categoryColor: '#6366f1',
            taskType: 'Timetable',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationMin * 60,
          }),
        }).catch((err) => console.error('Failed to create time record from timetable:', err))
      }
    },
    [debouncedSave],
  )

  const addRow = useCallback(() => {
    setEntries((prev) => {
      const newOrder = prev.length
      return [...prev, blankEntry(date, newOrder)]
    })
    debouncedSave()
  }, [date, debouncedSave])

  const removeRow = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, order: i })))
      debouncedSave()
    },
    [debouncedSave],
  )

  // ── Drag-to-reorder ─────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const activeDragEntry = activeDragId
    ? entries.find((e) => e.id === activeDragId) ?? null
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      setEntries((prev) => {
        const oldIndex = prev.findIndex((e) => e.id === active.id)
        const newIndex = prev.findIndex((e) => e.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev

        const next = [...prev]
        const [moved] = next.splice(oldIndex, 1)
        next.splice(newIndex, 0, moved)
        return next.map((e, i) => ({ ...e, order: i }))
      })
      debouncedSave()
    },
    [debouncedSave],
  )

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null)
  }, [])

  // ── Date navigation ────────────────────────────────────────────────────
  const shiftDate = useCallback(
    (delta: number) => {
      persist()
      const d = new Date(date + 'T00:00:00')
      d.setDate(d.getDate() + delta)
      setDate(toDateStr(d))
    },
    [date, persist],
  )

  const goToday = useCallback(() => {
    persist()
    setDate(toDateStr(new Date()))
  }, [persist])

  // ── Manual push: cascade from the last completed row ────────────────
  const manualPush = useCallback(() => {
    setEntries((prev) => {
      // Find the last row that has an actualEnd
      let lastCompletedIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].actualEnd) { lastCompletedIdx = i; break }
      }
      if (lastCompletedIdx === -1) return prev

      const next = [...prev]
      let cursor = next[lastCompletedIdx].actualEnd!
      for (let i = lastCompletedIdx + 1; i < next.length; i++) {
        const row = next[i]
        if (!row.plannedStart && !row.plannedEnd && !row.activityName) break
        if (row.actualEnd) { cursor = row.actualEnd; continue }

        const updated = { ...row }
        const dur =
          updated.expectedMinutes > 0
            ? updated.expectedMinutes
            : updated.plannedStart && updated.plannedEnd
              ? diffMinutes(updated.plannedStart, updated.plannedEnd)
              : 0

        updated.plannedStart = cursor
        if (dur > 0) {
          const startMin = parseTime(cursor)
          if (startMin !== null) {
            updated.plannedEnd = minutesToHHmm(startMin + dur)
            updated.expectedMinutes = dur
          }
        }
        updated.updatedAt = new Date().toISOString()
        next[i] = updated
        cursor = updated.plannedEnd || cursor
      }
      return next
    })
    debouncedSave()
  }, [debouncedSave])

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalExpected = entries.reduce((s, e) => s + (e.expectedMinutes || 0), 0)
  const totalActual = entries.reduce((s, e) => s + (e.actualMinutes || 0), 0)

  return {
    // State
    date,
    entries,
    loading,
    autofill,
    autopush,
    helpOpen,
    // State setters
    setAutofill,
    setAutopush,
    setHelpOpen,
    // Mutations
    updateEntry,
    handleActualEndChange,
    manualPush,
    addRow,
    removeRow,
    // Navigation
    shiftDate,
    goToday,
    // DnD
    sensors,
    activeDragEntry,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    // Computed
    totalExpected,
    totalActual,
  }
}
