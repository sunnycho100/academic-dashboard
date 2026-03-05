'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TimetableEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "YYYY-MM-DD" from a Date. */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Parse "HH:mm" and return total minutes since midnight, or null. */
function parseTime(t: string | null | undefined): number | null {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Diff in minutes between two "HH:mm" strings (handles overnight). */
function diffMinutes(start: string, end: string): number {
  const s = parseTime(start)
  const e = parseTime(end)
  if (s === null || e === null) return 0
  let diff = e - s
  if (diff < 0) diff += 24 * 60 // across midnight
  return diff
}

/** Format minutes as "Xh Ym". */
function fmtDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Describe variance from expected. */
function varianceNote(expected: number, actual: number | null): string {
  if (actual === null || expected === 0) return ''
  const diff = actual - expected
  if (diff === 0) return 'On time'
  if (diff > 0) return `+${fmtDuration(diff)} over`
  return `${fmtDuration(Math.abs(diff))} under`
}

/** Pretty date display. */
function prettyDate(dateStr: string): string {
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

// ---------------------------------------------------------------------------
// Blank row factory
// ---------------------------------------------------------------------------

const DEFAULT_ROW_COUNT = 20

function blankEntry(date: string, order: number): TimetableEntry {
  return {
    id: crypto.randomUUID(),
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
function padEntries(entries: TimetableEntry[], date: string): TimetableEntry[] {
  if (entries.length >= DEFAULT_ROW_COUNT) return entries
  const padded = [...entries]
  for (let i = entries.length; i < DEFAULT_ROW_COUNT; i++) {
    padded.push(blankEntry(date, i))
  }
  return padded
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Timetable() {
  const [date, setDate] = useState<string>(toDateStr(new Date()))
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries
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
        return next
      })
      debouncedSave()
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

  // ── Date navigation ────────────────────────────────────────────────────
  const shiftDate = useCallback(
    (delta: number) => {
      // Save current before switching
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

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalExpected = entries.reduce((s, e) => s + (e.expectedMinutes || 0), 0)
  const totalActual = entries.reduce((s, e) => s + (e.actualMinutes || 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Date navigation bar */}
      <div className="flex items-center gap-3 mb-5">
        <motion.div whileTap={{ scale: 0.92 }}>
          <Button variant="outline" size="icon" className="rounded-lg h-8 w-8" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>

        <motion.span
          key={date}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-semibold tracking-tight text-foreground/90 select-none"
        >
          {prettyDate(date)}
        </motion.span>

        <motion.div whileTap={{ scale: 0.92 }}>
          <Button variant="outline" size="icon" className="rounded-lg h-8 w-8" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={goToday}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Today
          </Button>
        </motion.div>

        <div className="flex-1" />

        {/* Summary pills */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 tabular-nums select-none">
          <span className="px-2 py-0.5 rounded-md bg-foreground/[0.04]">
            Plan: {fmtDuration(totalExpected)}
          </span>
          {totalActual > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-foreground/[0.04]">
              Actual: {fmtDuration(totalActual)}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl glass-thin">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground/60 select-none">
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[72px]">Start</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[72px]">End</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[68px]">Total</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06]">Activity</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[72px]">Act. Start</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[72px]">Act. End</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[68px]">Act. Dur</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[120px]">Notes</th>
              <th className="w-8 border-b border-white/[0.06]" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => (
                <TimetableRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={updateEntry}
                  onRemove={removeRow}
                  canRemove={entries.length > 1}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <div className="mt-3 flex justify-start">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Row
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function TimetableRow({
  entry,
  onUpdate,
  onRemove,
  canRemove,
}: {
  entry: TimetableEntry
  onUpdate: (id: string, patch: Partial<TimetableEntry>) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  const tdBase =
    'px-3 py-1.5 border-b border-white/[0.04] whitespace-nowrap align-middle'

  const inputBase =
    'bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/30 focus:ring-0 tabular-nums'

  const timeInputClass = `${inputBase} w-[56px]`

  const varianceText = entry.notes || ''
  const isOver = varianceText.includes('over')
  const isUnder = varianceText.includes('under')
  const isOnTime = varianceText === 'On time'

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="group hover:bg-foreground/[0.02] transition-colors"
    >
      {/* Planned Start */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.plannedStart}
          onChange={(e) => onUpdate(entry.id, { plannedStart: e.target.value })}
          className={timeInputClass}
        />
      </td>

      {/* Planned End */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.plannedEnd}
          onChange={(e) => onUpdate(entry.id, { plannedEnd: e.target.value })}
          className={timeInputClass}
        />
      </td>

      {/* Expected Total */}
      <td className={`${tdBase} text-muted-foreground/70 text-xs tabular-nums`}>
        {fmtDuration(entry.expectedMinutes)}
      </td>

      {/* Activity */}
      <td className={tdBase}>
        <input
          type="text"
          value={entry.activityName}
          onChange={(e) => onUpdate(entry.id, { activityName: e.target.value })}
          placeholder="Activity name…"
          className={`${inputBase}`}
        />
      </td>

      {/* Actual Start */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.actualStart ?? ''}
          onChange={(e) => onUpdate(entry.id, { actualStart: e.target.value || null })}
          className={timeInputClass}
        />
      </td>

      {/* Actual End */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.actualEnd ?? ''}
          onChange={(e) => onUpdate(entry.id, { actualEnd: e.target.value || null })}
          className={timeInputClass}
        />
      </td>

      {/* Actual Duration */}
      <td className={`${tdBase} text-muted-foreground/70 text-xs tabular-nums`}>
        {fmtDuration(entry.actualMinutes)}
      </td>

      {/* Notes / Variance */}
      <td className={`${tdBase} text-xs font-medium`}>
        <span
          className={
            isOver
              ? 'text-red-500/80'
              : isUnder
                ? 'text-emerald-500/80'
                : isOnTime
                  ? 'text-blue-500/80'
                  : 'text-muted-foreground/50'
          }
        >
          {varianceText || '—'}
        </span>
      </td>

      {/* Delete */}
      <td className={`${tdBase} text-center`}>
        {canRemove && (
          <button
            onClick={() => onRemove(entry.id)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </motion.tr>
  )
}
