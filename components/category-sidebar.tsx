'use client'

import { useState, useRef, useEffect } from 'react'
import { Category } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Search, BarChart3, Clock, Pencil, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { sidebarPillSpring } from '@/lib/liquidTransitions'
import { ActivitySummaryDialog } from './activity-summary-dialog'

interface CategorySidebarProps {
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  onAddCategory: () => void
  onRemoveCategory?: (categoryId: string) => void
  onRenameCategory?: (categoryId: string, newName: string) => void
  onReorderCategories?: (reorderedCategories: Category[]) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onOpenTimeRecords?: () => void
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
  onReorderCategories,
  searchQuery,
  onSearchChange,
  onOpenTimeRecords,
}: CategorySidebarProps) {
  const [editMode, setEditMode] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const startEditing = (cat: Category) => {
    setEditingId(cat.id)
    setEditValue(cat.name)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim() && onRenameCategory) {
      onRenameCategory(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (!onReorderCategories) return
    const newCategories = [...filteredCategories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newCategories.length) return
    ;[newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]]
    onReorderCategories(newCategories)
  }

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-64 border-r border-white/10 glass-thick flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-xs mb-3 text-muted-foreground/70 uppercase tracking-widest">
          Categories
        </h2>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 rounded-lg bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex gap-2">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              onClick={onAddCategory}
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-dashed border-white/15 hover:border-white/30 hover:bg-white/5 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </motion.div>
          {categories.length > 0 && (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => {
                  setEditMode(!editMode)
                  if (editMode) {
                    setEditingId(null)
                    setEditValue('')
                  }
                }}
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'rounded-lg transition-all duration-200',
                  !editMode && 'border-dashed border-white/15 hover:border-primary/50 hover:bg-primary/5 hover:text-primary'
                )}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {editMode ? 'Done' : 'Edit'}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* "All Categories" — only clickable when NOT in edit mode */}
          {!editMode && (
            <button
              onClick={() => onSelectCategory(null)}
              className={cn(
                'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200',
                selectedCategoryId === null
                  ? 'text-foreground'
                  : 'hover:bg-white/5 text-muted-foreground'
              )}
            >
              {selectedCategoryId === null && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-full"
                  transition={sidebarPillSpring}
                />
              )}
              <span className="relative z-10">All Categories</span>
            </button>
          )}
          {filteredCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="relative flex items-center group"
            >
              <button
                onClick={() => {
                  if (editMode) {
                    // In edit mode, clicking starts inline rename
                    if (editingId !== category.id) {
                      startEditing(category)
                    }
                  } else {
                    onSelectCategory(category.id)
                  }
                }}
                className={cn(
                  'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2.5',
                  editMode && 'pr-20',
                  !editMode && selectedCategoryId === category.id
                    ? 'text-foreground'
                    : !editMode
                      ? 'hover:bg-white/5 text-foreground/80'
                      : 'hover:bg-white/5 text-foreground/80 cursor-text'
                )}
              >
                {!editMode && selectedCategoryId === category.id && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-full"
                    transition={sidebarPillSpring}
                  />
                )}
                <div
                  className="relative z-10 w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: category.color,
                    boxShadow: !editMode && selectedCategoryId === category.id
                      ? `0 0 0 2px ${category.color}40, 0 0 0 4px ${category.color}20`
                      : 'none',
                  }}
                />
                <span className="relative z-10 truncate flex-1">
                  {editingId === category.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-sm w-full outline-none focus:ring-1 focus:ring-ring"
                    />
                  ) : (
                    category.name
                  )}
                </span>
              </button>

              {/* Edit mode controls: reorder + remove */}
              <AnimatePresence>
                {editMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute right-1.5 z-20 flex items-center gap-0.5"
                  >
                    {/* Move up */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      disabled={index === 0}
                      onClick={(e) => { e.stopPropagation(); moveCategory(index, 'up') }}
                      className={cn(
                        'p-0.5 rounded transition-colors',
                        index === 0
                          ? 'text-muted-foreground/20 cursor-not-allowed'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                      )}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </motion.button>
                    {/* Move down */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      disabled={index === filteredCategories.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveCategory(index, 'down') }}
                      className={cn(
                        'p-0.5 rounded transition-colors',
                        index === filteredCategories.length - 1
                          ? 'text-muted-foreground/20 cursor-not-allowed'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                      )}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.button>
                    {/* Remove */}
                    {onRemoveCategory && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveCategory(category.id)
                        }}
                        className="p-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors ml-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Time Records & Activity Summary Buttons */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={onOpenTimeRecords}
            variant="outline"
            size="sm"
            className="w-full rounded-lg border-white/15 hover:border-white/25 hover:bg-white/5 transition-all duration-200"
          >
            <Clock className="h-4 w-4 mr-2" />
            Time Records
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setSummaryOpen(true)}
            variant="outline"
            size="sm"
            className="w-full rounded-lg border-white/15 hover:border-white/25 hover:bg-white/5 transition-all duration-200"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Activity Summary
          </Button>
        </motion.div>
      </div>

      {/* Activity Summary Dialog */}
      <ActivitySummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
      />
    </div>
  )
}
