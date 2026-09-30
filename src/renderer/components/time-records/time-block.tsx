import { cn } from '@/lib/utils'
import {
  type TimeRecord,
  getBlockPosition,
  formatTimeLabel,
  formatDurationShort,
} from './helpers'

export interface TimeBlockProps {
  record: TimeRecord
  timelineStartHour: number
}

// Progressive content: show less info as duration shrinks
//   ≥ 60 min  → full: category, type, task title, time range, duration
//   30–59 min → compact: task title + time, duration
//   < 30 min  → minimal: task title only
export function TimeBlock({ record, timelineStartHour }: TimeBlockProps) {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  const { top, height } = getBlockPosition(start, end, timelineStartHour)

  const durationMin = record.duration / 60
  const isFull = durationMin >= 60
  const isCompact = durationMin >= 30 && durationMin < 60
  const isMinimal = durationMin < 30

  return (
    <div
      className={cn(
        'absolute left-[72px] right-3 rounded-md overflow-hidden cursor-default px-3 flex flex-col justify-center text-foreground',
        isMinimal ? 'py-0.5' : 'py-2'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        // ponytail: dynamic course color, the one inline style Tailwind can't express
        backgroundColor: `color-mix(in srgb, ${record.categoryColor} 22%, transparent)`,
      }}
      title={`${record.taskTitle}\n${record.categoryName} – ${record.taskType}\n${formatTimeLabel(start)} – ${formatTimeLabel(end)}\n${formatDurationShort(record.duration)}`}
    >
      {isFull && (
        <p className="font-medium text-[13px] leading-tight truncate">
          {record.categoryName} · {record.taskType}
        </p>
      )}
      {(isFull || isCompact) && (
        <p className={cn('truncate', isFull ? 'text-xs text-muted-foreground mt-0.5' : 'text-[13px] font-medium')}>
          {record.taskTitle}
        </p>
      )}
      {isMinimal && (
        <p className={cn('font-medium truncate', durationMin < 10 ? 'text-[10px]' : 'text-xs')}>
          {record.taskTitle}
        </p>
      )}
      {!isMinimal && (
        <p className={cn('text-[10px] text-muted-foreground tabular-nums', isFull ? 'mt-1' : 'mt-0.5')}>
          {formatTimeLabel(start)} – {formatTimeLabel(end)} · {formatDurationShort(record.duration)}
        </p>
      )}
    </div>
  )
}
