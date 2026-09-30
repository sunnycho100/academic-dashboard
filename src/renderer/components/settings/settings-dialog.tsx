import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Settings as SettingsIcon, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px] glass-overlay border-border shadow-2xl overflow-hidden p-0 gap-0">
            {/* Animated top gradient bar */}
            <motion.div
              className="h-[2px] w-full bg-border"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            />
            <DialogHeader className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-secondary backdrop-blur-sm flex items-center justify-center border border-violet-500/10">
                  <SettingsIcon className="h-4.5 w-4.5 text-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight">General Settings</DialogTitle>
                  <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
                    Manage your app preferences
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 space-y-8">
              {/* User Preferences Section */}
              <div className="space-y-6">

              {/* Power-Save Mode Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground/80" />
                  <h3 className="text-sm font-semibold tracking-wide">Time Saver Mode</h3>
                </div>
                <div className="pl-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="power-save-toggle" className="text-sm font-medium">Enable Power-Save</Label>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed pr-4">
                      Suspends heavy animations and background blur when idle for 5 minutes to save battery.
                    </p>
                  </div>
                  <Switch
                    id="power-save-toggle"
                    checked={powerSaveEnabled}
                    onCheckedChange={handlePowerSaveChange}
                  />
                </div>
              </div>

              </div>
            </div>
            
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
