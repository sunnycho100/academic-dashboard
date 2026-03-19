'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Settings as SettingsIcon, MonitorPlay, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export type AnimationFrequency = 'always' | 'daily' | 'never'

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [frequency, setFrequency] = useState<AnimationFrequency>('always')
  const [powerSaveEnabled, setPowerSaveEnabled] = useState(false)

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem('welcome-animation-frequency') as AnimationFrequency
        if (stored === 'always' || stored === 'daily' || stored === 'never') {
          setFrequency(stored)
        }
        setPowerSaveEnabled(localStorage.getItem('power-save-enabled') === 'true')
      } catch {}
    }
  }, [open])

  const handleFrequencyChange = (val: string) => {
    const newFreq = val as AnimationFrequency
    setFrequency(newFreq)
    try {
      localStorage.setItem('welcome-animation-frequency', newFreq)
    } catch {}
  }

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
          <DialogContent className="sm:max-w-[425px] glass-overlay border-white/10 shadow-2xl overflow-hidden p-0 gap-0">
            {/* Animated top gradient bar */}
            <motion.div
              className="h-[2px] w-full bg-gradient-to-r from-violet-500/80 via-fuchsia-400/80 to-pink-500/80"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            />
            <DialogHeader className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm flex items-center justify-center border border-violet-500/10">
                  <SettingsIcon className="h-4.5 w-4.5 text-violet-400" />
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

                {/* Welcome Animation Settings */}
                <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-muted-foreground/80" />
                  <h3 className="text-sm font-semibold tracking-wide">Welcome Animation</h3>
                </div>
                <div className="pl-6 space-y-3">
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    Choose how often you want to see the cursive greeting screen when you open or reload the dashboard.
                  </p>
                  <RadioGroup value={frequency} onValueChange={handleFrequencyChange} className="space-y-2.5">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="always" id="freq-always" />
                      <Label htmlFor="freq-always" className="text-sm cursor-pointer font-medium">Always (Default)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="daily" id="freq-daily" />
                      <Label htmlFor="freq-daily" className="text-sm cursor-pointer font-medium">Start of every day</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="never" id="freq-never" />
                      <Label htmlFor="freq-never" className="text-sm cursor-pointer font-medium text-foreground/80">Never turn on</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Power-Save Mode Settings */}
              <div className="space-y-4 pt-2">
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
