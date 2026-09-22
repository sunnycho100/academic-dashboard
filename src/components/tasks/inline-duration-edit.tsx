'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export interface InlineDurationEditProps {
  minutes: number | undefined
  onSave: (val: number | undefined) => void
}

export function InlineDurationEdit({ minutes, onSave }: InlineDurationEditProps) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(minutes ? String(Math.floor(minutes / 60)) : '0')
  const [mins, setMins] = useState(minutes ? String(minutes % 60) : '0')
  const hoursRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
    setMins(minutes ? String(minutes % 60) : '0')
  }, [minutes])

  useEffect(() => {
    if (editing) hoursRef.current?.focus()
  }, [editing])

  const commit = () => {
    const h = parseInt(hours || '0')
    const m = parseInt(mins || '0')
    const total = h * 60 + m
    onSave(total > 0 ? total : undefined)
    setEditing(false)
  }

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${mins}m`
  }

  if (editing) {
    return (
      <span 
        className="inline-flex items-center gap-1 bg-background/50 rounded p-0.5 shadow-sm transition-all duration-700 ease-out border border-border/50"
        onBlur={(e) => {
          // If the new focus target is not within this span, commit changes
          if (!e.currentTarget.contains(e.relatedTarget)) {
            commit()
          }
        }}
      >
        <Input
          ref={hoursRef}
          type="number"
          min="0"
          max="99"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
              setMins(minutes ? String(minutes % 60) : '0')
              setEditing(false)
            }
          }}
          className="h-7 text-xs px-1 py-0 w-10 border-none bg-transparent shadow-none focus-visible:ring-0 text-center"
        />
        <span className="text-[10px] text-muted-foreground font-medium -ml-1 pr-1">h</span>
        <Input
          type="number"
          min="0"
          max="59"
          value={mins}
          onChange={(e) => setMins(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setHours(minutes ? String(Math.floor(minutes / 60)) : '0')
              setMins(minutes ? String(minutes % 60) : '0')
              setEditing(false)
            }
          }}
          className="h-7 text-xs px-1 py-0 w-10 border-none bg-transparent shadow-none focus-visible:ring-0 text-center"
        />
        <span className="text-[10px] text-muted-foreground font-medium -ml-1 pr-1">m</span>
      </span>
    )
  }

  if (!minutes) {
    return (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors text-muted-foreground/40 italic"
        title="Click to set duration"
      >
        + time
      </span>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors"
      title="Click to edit duration"
    >
      {formatDuration(minutes)}
    </span>
  )
}
