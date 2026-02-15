'use client'

import { useState } from 'react'
import { Category } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Search, Minus, BarChart3, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ActivitySummaryDialog } from './activity-summary-dialog'

interface CategorySidebarProps {
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  onAddCategory: () => void
  onRemoveCategory?: (categoryId: string) => void
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
  searchQuery,
  onSearchChange,
  onOpenTimeRecords,
}: CategorySidebarProps) {
  const [removeMode, setRemoveMode] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h2 className="font-semibold text-xs mb-3 text-muted-foreground/70 uppercase tracking-widest">
          Categories
        </h2>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 rounded-lg bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex gap-2">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              onClick={onAddCategory}
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-dashed border-border/50 hover:border-border hover:bg-secondary/50 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </motion.div>
          {onRemoveCategory && categories.length > 0 && (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => setRemoveMode(!removeMode)}
                variant={removeMode ? 'destructive' : 'outline'}
                size="sm"
                className={cn(
                  'rounded-lg transition-all duration-200',
                  !removeMode && 'border-dashed border-border/50 hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive'
                )}
              >
                <Minus className="h-4 w-4 mr-1" />
                {removeMode ? 'Done' : 'Remove'}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200',
              selectedCategoryId === null
                ? 'text-foreground'
                : 'hover:bg-secondary/50 text-muted-foreground'
            )}
          >
            {selectedCategoryId === null && (
              <motion.div
                layoutId="sidebar-active-pill"
                className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">All Categories</span>
          </button>
          {filteredCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="relative flex items-center"
            >
              <button
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2.5',
                  removeMode && 'pr-10',
                  selectedCategoryId === category.id
                    ? 'text-foreground'
                    : 'hover:bg-secondary/50 text-foreground/80'
                )}
              >
                {selectedCategoryId === category.id && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <div
                  className="relative z-10 w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: category.color,
                    boxShadow: selectedCategoryId === category.id
                      ? `0 0 0 2px ${category.color}40, 0 0 0 4px ${category.color}20`
                      : 'none',
                  }}
                />
                <span className="relative z-10 truncate">{category.name}</span>
              </button>
              <AnimatePresence>
                {removeMode && onRemoveCategory && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0, x: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveCategory(category.id)
                    }}
                    className="absolute right-2 z-20 p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Time Records & Activity Summary Buttons */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={onOpenTimeRecords}
            variant="outline"
            size="sm"
            className="w-full rounded-lg border-border/50 hover:border-border hover:bg-secondary/50 transition-all duration-200"
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
            className="w-full rounded-lg border-border/50 hover:border-border hover:bg-secondary/50 transition-all duration-200"
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
