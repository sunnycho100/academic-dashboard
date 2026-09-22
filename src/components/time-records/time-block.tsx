'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  type TimeRecord,
  getBlockPosition,
  formatTimeLabel,
  formatDurationShort,
} from './helpers'

export interface TimeBlockProps {
  record: TimeRecord
  index: number
  timelineStartHour: number
}

// Progressive content: show less info as duration shrinks
//   ≥ 60 min  → full: category–type, task title, time range · duration
//   30–59 min → compact: task title + time · duration
//   < 30 min  → minimal: task title only
export function TimeBlock({ record, index, timelineStartHour }: TimeBlockProps) {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  const { top, height } = getBlockPosition(start, end, timelineStartHour)

  const durationMin = record.duration / 60
  const isFull = durationMin >= 60
  const isCompact = durationMin >= 30 && durationMin < 60
  const isMinimal = durationMin < 30
  const color = record.categoryColor

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scaleY: 0.85 }}
      animate={{ opacity: 1, x: 0, scaleY: 1 }}
      exit={{ opacity: 0, x: -20, scaleY: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
        delay: index * 0.06,
      }}
      className="absolute left-[72px] right-3 rounded-xl overflow-hidden cursor-default group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      title={`${record.taskTitle}\n${record.categoryName} – ${record.taskType}\n${formatTimeLabel(start)} – ${formatTimeLabel(end)}\n${formatDurationShort(record.duration)}`}
    >
      {/* Layered glass background */}
      <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: color, opacity: 0.75 }} />
      <div className="absolute inset-0 rounded-xl backdrop-blur-md bg-gradient-to-br from-white/20 via-transparent to-black/10" />
      {/* Top inset highlight */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-xl" style={{ background: `linear-gradient(to right, ${color}00, ${color}80, ${color}00)` }} />
      {/* Left accent bar */}
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
      {/* Border */}
      <div className="absolute inset-0 rounded-xl border" style={{ borderColor: `${color}30` }} />
      <div className={cn(
        "h-full px-3.5 flex flex-col justify-center text-white relative z-10",
        isMinimal ? 'py-0.5' : 'py-2'
      )}>
        {/* Full: show category–type header */}
        {isFull && (
          <p className="font-bold text-[13px] leading-tight truncate drop-shadow-sm">
            {record.categoryName} – {record.taskType}
          </p>
        )}
        {/* Full & Compact: show task title */}
        {(isFull || isCompact) && (
          <p className={cn(
            'truncate font-medium drop-shadow-sm',
            isFull ? 'text-[12px] text-white/85 mt-0.5' : 'text-[13px] font-bold text-white'
          )}>
            {record.taskTitle}
          </p>
        )}
        {/* Minimal: task title only, sized to fit */}
        {isMinimal && (
          <p className={cn(
            'font-bold truncate drop-shadow-sm text-white',
            durationMin < 10 ? 'text-[10px]' : 'text-[12px]'
          )}>
            {record.taskTitle}
          </p>
        )}
        {/* Full & Compact: show time range */}
        {!isMinimal && (
          <p className={cn(
            'text-white/65 tabular-nums font-medium',
            isFull ? 'text-[10px] mt-1' : 'text-[9px] mt-0.5'
          )}>
            {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
          </p>
        )}
      </div>
    </motion.div>
  )
}
