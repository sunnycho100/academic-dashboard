import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { emptyPanel, hourlyRate, palette, setPref, showEarnings, showSeconds } from '@/lib/prefs'
import { logicalToday } from '@/hooks/use-today-session'
import { THEMES } from '@/lib/themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Close Settings and open the Edit display bar over the real screen */
  onEditDisplay: () => void
}

const EMPTY_LABEL = { now: 'Big 0:00', today: 'Today so far', week: 'Last 7 days' }

export function SettingsDialog({ open, onOpenChange, onEditDisplay }: SettingsDialogProps) {
  const [powerSaveEnabled, setPowerSaveEnabled] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [seconds, setSeconds] = useState(true)
  const [earnings, setEarnings] = useState(true)
  const [rate, setRate] = useState('20')
  // When the day rolls over: totals, Done today, the timeline and the Today plan all follow it.
  // Shared with the day boundaries in Time records (end past 24 means after midnight).
  const [dayEnd, setDayEnd] = useState(24)

  useEffect(() => {
    if (open) {
      try {
        setPowerSaveEnabled(localStorage.getItem('power-save-enabled') === 'true')
      } catch {}
      setSeconds(showSeconds())
      setEarnings(showEarnings())
      setRate(String(hourlyRate()))
      setDayEnd(Math.min(29, Math.max(24, logicalToday().endHour)))
      fetch('/api/widget')
        .then((r) => r.json())
        .then((w: { open: boolean }) => setWidgetOpen(w.open))
        .catch(() => {})
    }
  }, [open])

  const handleWidgetChange = (checked: boolean) => {
    setWidgetOpen(checked)
    fetch('/api/widget', { method: 'POST', body: JSON.stringify({ open: checked }) }).catch(() => {})
  }

  const handleEarningsChange = (checked: boolean) => {
    setEarnings(checked)
    setPref('show-earnings', String(checked))
  }

  const handleSecondsChange = (checked: boolean) => {
    setSeconds(checked)
    setPref('show-seconds', String(checked))
  }

  const handleDayEndChange = (end: number) => {
    setDayEnd(end)
    try {
      // The day starts where the last one ended (3 AM to 3 AM), so no hour belongs to neither
      localStorage.setItem('timeRecords-dayBoundaries', JSON.stringify({ start: end - 24, end }))
    } catch {}
    // Totals and the timeline reload for the new day
    window.dispatchEvent(new Event('time-records-changed'))
    window.dispatchEvent(new Event('prefs-changed'))
  }

  const handleRateChange = (value: string) => {
    setRate(value)
    const n = Number(value)
    if (value.trim() !== '' && Number.isFinite(n) && n >= 0) setPref('hourly-rate', String(n))
  }

  const handlePowerSaveChange = (checked: boolean) => {
    setPowerSaveEnabled(checked)
    try {
      localStorage.setItem('power-save-enabled', String(checked))
      window.dispatchEvent(new Event('power-save-toggled'))
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[425px] gap-0 p-0" aria-describedby={undefined}>
        <div className="px-6 pt-6">
          <DialogTitle className="font-serif text-2xl font-normal">Settings</DialogTitle>
        </div>

        <div className="px-6 pt-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Display</h3>
          <div className="mt-3 flex items-center justify-between gap-6">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Colors</dt>
              <dd>{THEMES.find((t) => t.id === palette())?.name ?? 'Classic'}</dd>
              <dt className="text-muted-foreground">Nothing planned</dt>
              <dd>{EMPTY_LABEL[emptyPanel()]}</dd>
            </dl>
            <Button variant="outline" size="sm" onClick={onEditDisplay}>
              Edit display
            </Button>
          </div>
        </div>

        <div className="px-6 pt-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Timer</h3>
          <div className="mt-3 flex items-center justify-between gap-6">
            <Label htmlFor="widget-toggle" className="text-sm font-normal">
              Desktop widget
            </Label>
            <Switch id="widget-toggle" checked={widgetOpen} onCheckedChange={handleWidgetChange} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-6">
            <Label htmlFor="seconds-toggle" className="text-sm font-normal">
              Show seconds
            </Label>
            <Switch id="seconds-toggle" checked={seconds} onCheckedChange={handleSecondsChange} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-6">
            <Label htmlFor="day-end" className="text-sm font-normal">
              Day ends at
            </Label>
            <select
              id="day-end"
              value={dayEnd}
              onChange={(e) => handleDayEndChange(Number(e.target.value))}
              className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums"
            >
              {[24, 25, 26, 27, 28, 29].map((h) => (
                <option key={h} value={h}>
                  {h === 24 ? '12 AM' : `${h - 24} AM`}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center justify-between gap-6">
            <Label htmlFor="earnings-toggle" className="text-sm font-normal">
              Show earnings
            </Label>
            <Switch id="earnings-toggle" checked={earnings} onCheckedChange={handleEarningsChange} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-6">
            <Label htmlFor="hourly-rate" className={cn('text-sm font-normal', !earnings && 'text-muted-foreground')}>
              Hourly value
            </Label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">$</span>
              <Input
                id="hourly-rate"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={rate}
                onChange={(e) => handleRateChange(e.target.value)}
                className="h-8 w-20 tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Power save</h3>
          <div className="mt-3 flex items-center justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="power-save-toggle" className="text-sm font-normal">
                Pause animations when idle
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                After 5 minutes without input, animations and background blur stop to save battery.
              </p>
            </div>
            <Switch
              id="power-save-toggle"
              checked={powerSaveEnabled}
              onCheckedChange={handlePowerSaveChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
