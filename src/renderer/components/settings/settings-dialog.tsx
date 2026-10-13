import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { hourlyRate, setPref, showSeconds } from '@/lib/prefs'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [powerSaveEnabled, setPowerSaveEnabled] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [seconds, setSeconds] = useState(true)
  const [rate, setRate] = useState('20')

  useEffect(() => {
    if (open) {
      try {
        setPowerSaveEnabled(localStorage.getItem('power-save-enabled') === 'true')
      } catch {}
      setSeconds(showSeconds())
      setRate(String(hourlyRate()))
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

  const handleSecondsChange = (checked: boolean) => {
    setSeconds(checked)
    setPref('show-seconds', String(checked))
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
            <div className="space-y-1">
              <Label htmlFor="hourly-rate" className="text-sm font-normal">
                Hourly value
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Each hour you track counts as this much earned.
              </p>
            </div>
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
