import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { isLogicalToday, getCurrentTimePosition } from './helpers'

export interface CurrentTimeLineProps {
  date: Date
  timelineStartHour: number
  timelineEndHour: number
}

export function CurrentTimeLine({ date, timelineStartHour, timelineEndHour }: CurrentTimeLineProps) {
  const [position, setPosition] = useState<number | null>(null)

  useEffect(() => {
    const isToday = isLogicalToday(date, timelineStartHour, timelineEndHour)
    if (!isToday) {
      setPosition(null)
      return
    }

    const update = () => setPosition(getCurrentTimePosition(timelineStartHour, timelineEndHour))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [date, timelineStartHour, timelineEndHour])

  if (position === null) return null

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="relative flex items-center">
        <div className="absolute left-[72px] right-3 h-px bg-coral" />
        <div className="absolute left-[69px] h-[7px] w-[7px] rounded-full bg-coral" />
        <span className="absolute right-4 -top-4 bg-popover px-1 text-[10px] text-coral tabular-nums">
          {format(new Date(), 'h:mm a')}
        </span>
      </div>
    </div>
  )
}
