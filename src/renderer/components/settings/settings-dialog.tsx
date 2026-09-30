import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [powerSaveEnabled, setPowerSaveEnabled] = useState(false)

  useEffect(() => {
    if (open) {
      try {
        setPowerSaveEnabled(localStorage.getItem('power-save-enabled') === 'true')
      } catch {}
    }
  }, [open])

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
