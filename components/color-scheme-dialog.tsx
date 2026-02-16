'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, BookOpen, FolderGit2, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'project', label: 'Project', icon: FolderGit2 },
  { key: 'job-application', label: 'Job App', icon: Briefcase },
]

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
  const [showContent, setShowContent] = useState(false)
  const [devColors, setDevColors] = useState<Record<string, string>>(DEFAULT_PERSONAL_DEV_COLORS)

  useEffect(() => {
    if (open) {
      setDevColors(loadPersonalDevColors())
      const timer = setTimeout(() => setShowContent(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [open])

  const handleDevColorChange = (key: string, color: string) => {
    const next = { ...devColors, [key]: color }
    setDevColors(next)
    savePersonalDevColors(next)
  }

  const handleClose = () => {
    setShowContent(false)
    setTimeout(() => onOpenChange(false), 150)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              className="pointer-events-auto w-full max-w-md rounded-2xl glass-overlay border border-white/10 shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <motion.h2
                  className="text-lg font-bold tracking-tight"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -8 }}
                  transition={{ duration: 0.2, delay: 0.08 }}
                >
                  Color Scheme
                </motion.h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Course Categories */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 8 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Course Categories
                  </h3>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5"
                      >
                        <Input
                          type="color"
                          value={cat.color}
                          onChange={(e) => onCategoryColorChange(cat.id, e.target.value)}
                          className="h-7 w-8 p-0.5 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium flex-1">{cat.name}</span>
                        <span className="text-xs text-muted-foreground/60 font-mono">
                          {cat.color}
                        </span>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-sm text-muted-foreground/50 text-center py-2">
                        No categories yet
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Personal Dev Activities */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 8 }}
                  transition={{ duration: 0.2, delay: 0.16 }}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Personal Development
                  </h3>
                  <div className="space-y-2">
                    {PERSONAL_DEV_ACTIVITIES.map((activity) => {
                      const Icon = activity.icon
                      const color = devColors[activity.key] || DEFAULT_PERSONAL_DEV_COLORS[activity.key]
                      return (
                        <div
                          key={activity.key}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5"
                        >
                          <Input
                            type="color"
                            value={color}
                            onChange={(e) => handleDevColorChange(activity.key, e.target.value)}
                            className="h-7 w-8 p-0.5 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <div
                            className="h-6 w-6 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: color + '20' }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color }} />
                          </div>
                          <span className="text-sm font-medium flex-1">{activity.label}</span>
                          <span className="text-xs text-muted-foreground/60 font-mono">
                            {color}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/10 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
