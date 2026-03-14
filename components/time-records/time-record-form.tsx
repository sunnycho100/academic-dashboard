'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { loadPersonalDevColors } from '@/components/color-scheme-dialog'
import type { NewRecordForm } from './helpers'

export interface TimeRecordFormProps {
  form: NewRecordForm
  onFormChange: (form: NewRecordForm) => void
  categories: { name: string; color: string }[]
  onSave: () => void
  onCancel: () => void
}

export function TimeRecordForm({
  form,
  onFormChange,
  categories,
  onSave,
  onCancel,
}: TimeRecordFormProps) {
  const [customCategoryMode, setCustomCategoryMode] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 space-y-2"
    >
      {/* Quick-pick presets for Personal Dev */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground mr-1">Quick:</span>
        {(() => {
          const pdColors = loadPersonalDevColors()
          return [
            { label: 'Reading', key: 'reading' },
            { label: 'Project', key: 'project' },
            { label: 'Job App', key: 'job-application' },
          ].map((preset) => {
            const color = pdColors[preset.key]
            return (
              <Button
                key={preset.label}
                type="button"
                variant={form.taskTitle === preset.label && form.categoryName === 'Personal Dev' ? 'secondary' : 'outline'}
                size="sm"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => onFormChange({
                  ...form,
                  taskTitle: preset.label,
                  categoryName: 'Personal Dev',
                  categoryColor: color,
                  taskType: preset.label,
                })}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {preset.label}
              </Button>
            )
          })
        })()}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={form.taskTitle}
          onChange={(e) => onFormChange({ ...form, taskTitle: e.target.value })}
          className="h-7 text-xs flex-1 min-w-[100px]"
          placeholder="Title (e.g. A02 Review)"
        />
        {customCategoryMode ? (
          <div className="flex items-center gap-1">
            <Input
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customCategoryName.trim()) {
                  onFormChange({ ...form, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                  setCustomCategoryMode(false)
                  setCustomCategoryName('')
                }
                if (e.key === 'Escape') { setCustomCategoryMode(false); setCustomCategoryName('') }
              }}
              autoFocus
              className="h-7 text-xs w-[90px]"
              placeholder="New category"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs text-primary"
              onClick={() => {
                if (customCategoryName.trim()) {
                  onFormChange({ ...form, categoryName: customCategoryName.trim(), categoryColor: '#6366f1' })
                }
                setCustomCategoryMode(false)
                setCustomCategoryName('')
              }}
            >
              OK
            </Button>
          </div>
        ) : (
          <select
            value={form.categoryName}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                setCustomCategoryMode(true)
                return
              }
              const cat = categories.find((c) => c.name === e.target.value)
              onFormChange({ ...form, categoryName: e.target.value, categoryColor: cat?.color || '#6366f1' })
            }}
            className="h-7 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring min-w-[100px]"
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
            <option value="__add_new__">+ Add New</option>
          </select>
        )}
        <Input
          type="time"
          value={form.startTime}
          onChange={(e) => onFormChange({ ...form, startTime: e.target.value })}
          className="h-7 text-xs w-[90px]"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="time"
          value={form.endTime}
          onChange={(e) => onFormChange({ ...form, endTime: e.target.value })}
          className="h-7 text-xs w-[90px]"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary"
          onClick={onSave}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  )
}
