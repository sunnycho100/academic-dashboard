import { useEffect, useReducer } from 'react'
import { THEMES } from '@/lib/themes'
import { emptyPanel, endPreview, palette, previewPref, showSeconds } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EMPTY_CHOICES = [
  ['now', 'Big 0:00'],
  ['today', 'Today so far'],
  ['week', 'Last 7 days'],
] as const

/** A choice set as underlined text, like the course picker. */
function TextChoice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'border-b-[1.5px] pb-px text-sm transition-colors',
        selected ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Edit display: a bar under the header that tries display choices on the real screen.
 * Nothing is saved until Save; Cancel (or Escape) puts back what was there.
 */
export function DisplayBar({ onClose }: { onClose: () => void }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    window.addEventListener('prefs-changed', refresh)
    return () => window.removeEventListener('prefs-changed', refresh)
  }, [])

  const close = (save: boolean) => {
    endPreview(save)
    onClose()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-bound each render so it always closes over the latest onClose

  const theme = palette()
  const empty = emptyPanel()
  const seconds = showSeconds()

  return (
    <div role="region" aria-label="Edit display" className="flex-shrink-0 border-b border-border bg-card px-7 py-3">
      <div className="flex items-start gap-6">
        <p className="w-16 flex-shrink-0 pt-1 text-xs uppercase tracking-wider text-muted-foreground">Colors</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label="Color theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => previewPref('palette', t.id)}
              aria-pressed={theme === t.id}
              title={t.from}
              className="group flex items-center gap-2"
            >
              <span
                className={cn(
                  'flex h-5 w-7 overflow-hidden rounded-[4px] ring-1 ring-black/10 transition-shadow',
                  theme === t.id && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
                )}
                aria-hidden
              >
                {t.swatch.map((c) => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </span>
              <span
                className={cn(
                  'border-b-[1.5px] pb-px text-sm',
                  theme === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground group-hover:text-foreground',
                )}
              >
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="flex items-center gap-6">
          <p className="w-16 flex-shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Today</p>
          <span className="text-sm text-muted-foreground">When nothing is planned</span>
          <div className="flex gap-4" role="group" aria-label="When nothing is planned">
            {EMPTY_CHOICES.map(([v, label]) => (
              <TextChoice key={v} selected={empty === v} onClick={() => previewPref('empty-panel', v)}>
                {label}
              </TextChoice>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4" role="group" aria-label="Seconds">
          <span className="text-sm text-muted-foreground">Seconds</span>
          <TextChoice selected={seconds} onClick={() => previewPref('show-seconds', 'true')}>
            On
          </TextChoice>
          <TextChoice selected={!seconds} onClick={() => previewPref('show-seconds', 'false')}>
            Off
          </TextChoice>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => close(true)}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
