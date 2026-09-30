import { useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CourseRingProps {
  color: string
  checked: boolean
  onToggle: () => void
  /** Stagger slot for the draw-in animation; null renders the ring already drawn */
  drawIndex?: number | null
  label: string
}

/**
 * The complete button, drawn in the course color. On first appearance the color
 * traces around a faint track anticlockwise from 12 o'clock (see .ring-draw).
 */
export function CourseRing({ color, checked, onToggle, drawIndex = null, label }: CourseRingProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex-shrink-0 h-5 w-5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* scaleX(-1) mirrors the stroke direction to anticlockwise; the top stays the start */}
      <svg viewBox="0 0 20 20" className="h-5 w-5 -scale-x-100">
        <circle cx="10" cy="10" r="8" fill={checked ? color : 'none'} strokeWidth="2" className="stroke-ring-track" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
          className={cn(drawIndex !== null && 'ring-draw')}
          style={drawIndex !== null ? { animationDelay: `${150 + drawIndex * 90}ms` } : undefined}
        />
      </svg>
    </button>
  )
}

// Task ids that have already been shown this session, so the ring only draws in
// on first appearance and for newly added tasks, not on filter or tab switches.
let seenTaskIds: Set<string> | null = null

/** Returns the ids that should play the draw-in animation on this render. */
export function useFreshTaskIds(allTaskIds: string[]): Set<string> {
  // Keyed by the id list contents, not the array identity.
  const key = allTaskIds.join(',')
  const fresh = useMemo(
    () => new Set(seenTaskIds === null ? allTaskIds : allTaskIds.filter((id) => !seenTaskIds!.has(id))),
    [key],
  )
  useEffect(() => {
    seenTaskIds = new Set([...(seenTaskIds ?? []), ...allTaskIds])
  }, [key])
  return fresh
}
