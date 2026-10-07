import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Category } from '@/lib/types'

// ── Personal Dev defaults & localStorage key ──
const PERSONAL_DEV_COLORS_KEY = 'personal-dev-colors'

export const DEFAULT_PERSONAL_DEV_COLORS: Record<string, string> = {
  reading: '#f59e0b',
  project: '#8b5cf6',
  'job-application': '#06b6d4',
}

export function loadPersonalDevColors(): Record<string, string> {
  if (typeof window === 'undefined') return { ...DEFAULT_PERSONAL_DEV_COLORS }
  try {
    const raw = localStorage.getItem(PERSONAL_DEV_COLORS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_PERSONAL_DEV_COLORS, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_PERSONAL_DEV_COLORS }
}

export function savePersonalDevColors(colors: Record<string, string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PERSONAL_DEV_COLORS_KEY, JSON.stringify(colors))
}

const PERSONAL_DEV_ACTIVITIES = [
  { key: 'reading', label: 'Reading' },
  { key: 'project', label: 'Research' },
  { key: 'job-application', label: 'Job App' },
]

const sectionLabel = 'text-xs uppercase tracking-wider text-muted-foreground'
// One round swatch per color: the native picker with its chrome stripped
const swatch =
  'h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0'
const row = 'flex cursor-pointer items-center gap-3 py-2.5 text-sm'

interface ColorSchemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onCategoryColorChange: (id: string, color: string) => void
}

export function ColorSchemeDialog({
  open,
  onOpenChange,
  categories,
  onCategoryColorChange,
}: ColorSchemeDialogProps) {
  const [devColors, setDevColors] = useState<Record<string, string>>(DEFAULT_PERSONAL_DEV_COLORS)

  useEffect(() => {
    if (open) setDevColors(loadPersonalDevColors())
  }, [open])

  const handleDevColorChange = (key: string, color: string) => {
    const next = { ...devColors, [key]: color }
    setDevColors(next)
    savePersonalDevColors(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" aria-describedby={undefined}>
        <div className="px-6 pt-6">
          <DialogTitle className="font-serif text-2xl font-normal">Colors</DialogTitle>
        </div>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className={sectionLabel}>Courses</h3>
            <div className="mt-2 divide-y divide-border">
              {categories.map((cat) => (
                <label key={cat.id} className={row}>
                  <input
                    type="color"
                    value={cat.color}
                    onChange={(e) => onCategoryColorChange(cat.id, e.target.value)}
                    className={swatch}
                  />
                  {cat.name}
                </label>
              ))}
              {categories.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">No courses yet</p>
              )}
            </div>
          </section>

          <section>
            <h3 className={sectionLabel}>Personal development</h3>
            <div className="mt-2 divide-y divide-border">
              {PERSONAL_DEV_ACTIVITIES.map((activity) => (
                <label key={activity.key} className={row}>
                  <input
                    type="color"
                    value={devColors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]}
                    onChange={(e) => handleDevColorChange(activity.key, e.target.value)}
                    className={swatch}
                  />
                  {activity.label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button onClick={() => onOpenChange(false)} className="rounded-full px-5">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
