'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableTodayItemProps {
  id: string
  children: (
    listeners: ReturnType<typeof useSortable>['listeners'],
    attributes: ReturnType<typeof useSortable>['attributes']
  ) => React.ReactNode
}

export function SortableTodayItem({ id, children }: SortableTodayItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children(listeners, attributes)}
    </div>
  )
}
