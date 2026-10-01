import { useState, useRef, useEffect } from 'react'
import { Category, Task } from '@/lib/types'
import { courseSummary } from '@/lib/task-format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
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
  tasks: Task[]
}

export function CategorySidebar({
  categories,
  tasks,
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
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-full">
      {/* Compact title-bar row for the macOS traffic lights, like Claude and Chrome */}
      <div className="app-drag h-[52px] flex-shrink-0" />
      <div className="px-4 pt-1 pb-4 border-b border-border">
        <h2 className="font-medium text-xs mb-3 text-muted-foreground uppercase tracking-widest">
          Courses
        </h2>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 rounded-lg bg-secondary border-border text-sm placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex gap-1 -mx-2">
          <Button
            onClick={onAddCategory}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            New course
          </Button>
          {categories.length > 0 && (
            <Button
              onClick={() => {
                setEditMode(!editMode)
                if (editMode) {
                  setEditingId(null)
                  setEditValue('')
                }
              }}
              variant="ghost"
              size="sm"
              className={cn('ml-auto', editMode ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {editMode ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* "All tasks": only clickable when NOT in edit mode */}
          {!editMode && (
            <button
              onClick={() => onSelectCategory(null)}
              className={cn(
                'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                selectedCategoryId === null
                  ? 'text-foreground bg-secondary'
                  : 'hover:bg-secondary text-muted-foreground'
              )}
            >
              <span className="relative z-10 flex items-center">
                All tasks
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
              </span>
            </button>
          )}
          {filteredCategories.map((category, index) => (
            <div key={category.id} className="relative flex items-center group">
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
                  'relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2.5 cursor-pointer',
                  editMode && 'pr-20',
                  !editMode && selectedCategoryId === category.id
                    ? 'text-foreground bg-secondary'
                    : !editMode
                      ? 'hover:bg-secondary text-foreground/80'
                      : 'hover:bg-secondary text-foreground/80 cursor-text'
                )}
              >
                <svg
                  viewBox="0 0 10 10"
                  className="relative z-10 w-2.5 h-2.5 flex-shrink-0 self-start mt-[5px]"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="5" r="4" fill="none" stroke={category.color} strokeWidth="2" />
                </svg>
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
                      className="bg-secondary border border-border rounded px-1.5 py-0.5 text-sm w-full outline-none focus:ring-1 focus:ring-ring"
                    />
                  ) : (
                    <>
                      <span className="block truncate">{category.name}</span>
                      {!editMode && (
                        <span className="block truncate text-xs font-normal text-muted-foreground mt-0.5">
                          {courseSummary(tasks.filter((t) => t.categoryId === category.id))}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </button>

              {/* Edit mode controls: reorder + remove */}
              <AnimatePresence>
                {editMode && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
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
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.button>
                    {/* Remove */}
                    {onRemoveCategory && (
                      <motion.button
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
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Time Records & Activity Summary Buttons */}
      <div className="p-2 border-t border-border">
        <Button
          onClick={onOpenTimeRecords}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          Time records
        </Button>
        <Button
          onClick={() => setSummaryOpen(true)}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          Activity summary
        </Button>
      </div>

      {/* Activity Summary Dialog */}
      <ActivitySummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
      />
    </div>
  )
}
