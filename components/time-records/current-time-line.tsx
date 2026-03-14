'use client'

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
        <div className="absolute left-[72px] right-3 h-[2px] bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500/50 shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
        <div className="absolute left-[66px] w-3 h-3 rounded-full bg-rose-500 border-2 border-background shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <span className="absolute right-4 -top-3 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md tabular-nums shadow-lg">
          {format(new Date(), 'h:mm a')}
        </span>
      </div>
    </div>
  )
}
