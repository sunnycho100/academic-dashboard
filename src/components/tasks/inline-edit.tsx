'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface InlineEditProps {
  value: string
  onSave: (val: string) => void
  className?: string
  type?: 'text' | 'date'
}

export function InlineEdit({
  value,
  onSave,
  className,
  type = 'text',
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      if (type === 'text') inputRef.current?.select()
    }
  }, [editing, type])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const commit = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim())
    } else {
      setEditValue(value)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setEditValue(value)
            setEditing(false)
          }
        }}
        className={cn('h-7 px-1.5 py-0 w-auto min-w-0 border-border/50 bg-background', className)}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn('cursor-pointer hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors', className)}
      title="Click to edit"
    >
      {type === 'date' && value ? new Date(value + 'T00:00:00').toLocaleDateString() : value}
    </span>
  )
}
