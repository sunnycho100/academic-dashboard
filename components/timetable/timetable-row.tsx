'use client'

import { TimetableEntry } from '@/lib/types'
import { GripVertical, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fmtDuration, getAutofillTime, getEndTimeAmPmDefault } from '@/hooks/use-timetable-logic'

export interface TimetableRowProps {
  entry: TimetableEntry
  onUpdate: (id: string, patch: Partial<TimetableEntry>) => void
  onActualEndChange: (id: string, actualEnd: string | null) => void
  onRemove: (id: string) => void
  canRemove: boolean
  autofill: boolean
  entries: TimetableEntry[]
  rowIndex: number
}

export function TimetableRow({
  entry,
  onUpdate,
  onActualEndChange,
  onRemove,
  canRemove,
  autofill,
  entries,
  rowIndex,
}: TimetableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : ('auto' as const),
  }

  const tdBase =
    'px-3 py-1.5 border-b border-white/[0.04] whitespace-nowrap align-middle'

  const inputBase =
    'bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:shadow-none focus:bg-foreground/[0.03] dark:focus:bg-white/[0.06] px-2 py-1 -mx-2 -my-1 rounded-md transition-all tabular-nums'

  const timeInputClass = `${inputBase} w-[92px]`

  const varianceText = entry.notes || ''
  const isOver = varianceText.includes('over')
  const isUnder = varianceText.includes('under')
  const isOnTime = varianceText === 'On time'

  const isCompleted = !!(entry.actualStart && entry.actualEnd)

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: isCompleted
          ? 'rgba(52, 211, 153, 0.08)'
          : 'rgba(0, 0, 0, 0)',
      }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2, backgroundColor: { duration: 0.5, ease: 'easeOut' } }}
      className="group hover:bg-foreground/[0.02] transition-[filter]"
    >
      {/* Drag handle */}
      <td className={`${tdBase} w-7 text-center cursor-grab active:cursor-grabbing`}>
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity text-muted-foreground touch-none"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>

      {/* Planned Start */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.plannedStart}
          onChange={(e) => onUpdate(entry.id, { plannedStart: e.target.value })}
          onFocus={() => {
            if (autofill && !entry.plannedStart) {
              onUpdate(entry.id, { plannedStart: getAutofillTime(entries, rowIndex) })
            }
          }}
          className={timeInputClass}
        />
      </td>

      {/* Planned End */}
      <td className={tdBase}>
        <input
          type="time"
          value={entry.plannedEnd}
          onChange={(e) => onUpdate(entry.id, { plannedEnd: e.target.value })}
          onFocus={() => {
            if (autofill && !entry.plannedEnd && entry.plannedStart) {
              const ampmDefault = getEndTimeAmPmDefault(entry.plannedStart)
              if (ampmDefault) onUpdate(entry.id, { plannedEnd: ampmDefault })
            }
          }}
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
          onChange={(e) => onActualEndChange(entry.id, e.target.value || null)}
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
