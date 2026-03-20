'use client'

import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight, Calendar, GripVertical, HelpCircle, RefreshCw, FastForward, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTimetableLogic, prettyDate, fmtDuration } from '@/hooks/use-timetable-logic'
import { TimetableRow } from '@/components/timetable/timetable-row'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Timetable() {
  const {
    date,
    entries,
    autofill,
    autopush,
    helpOpen,
    setAutofill,
    setAutopush,
    setHelpOpen,
    updateEntry,
    handleActualEndChange,
    manualPush,
    forwardYesterday,
    clearDay,
    addRow,
    removeRow,
    shiftDate,
    goToday,
    sensors,
    activeDragEntry,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    totalExpected,
    totalActual,
  } = useTimetableLogic()

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Date navigation bar */}
      <div className="flex items-center gap-3 mb-5">
        <motion.div whileTap={{ scale: 0.92 }}>
          <Button variant="outline" size="icon" className="rounded-lg h-8 w-8" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>

        <motion.span
          key={date}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-semibold tracking-tight text-foreground/90 select-none"
        >
          {prettyDate(date)}
        </motion.span>

        <motion.div whileTap={{ scale: 0.92 }}>
          <Button variant="outline" size="icon" className="rounded-lg h-8 w-8" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={goToday}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Today
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-xs"
            onClick={forwardYesterday}
            title="Bring incomplete tasks from previous days to today"
          >
            <FastForward className="h-3.5 w-3.5 mr-1.5" />
            Forward YTD
          </Button>
        </motion.div>

        <div className="flex-1" />

        {/* Autofill toggle + help */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHelpOpen(true)}
            className="h-5 w-5 rounded-full border border-muted-foreground/20 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-muted-foreground/40 transition-colors"
            title="What is Autofill?"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
          <button
            onClick={() => setAutofill((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
              autofill
                ? 'bg-emerald-400/70 dark:bg-emerald-500/50'
                : 'bg-foreground/10'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autofill ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
          <span className="text-[11px] text-muted-foreground/60 select-none">
            Autofill
          </span>
        </div>

        {/* Autopush toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutopush((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
              autopush
                ? 'bg-sky-400/70 dark:bg-sky-500/50'
                : 'bg-foreground/10'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autopush ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
          <span className="text-[11px] text-muted-foreground/60 select-none">
            Autopush
          </span>
          <motion.div whileTap={{ scale: 0.85 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground/50 hover:text-foreground/70"
              onClick={manualPush}
              title="Manually push planned times from last completed row"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </motion.div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 tabular-nums select-none ml-3">
          <span className="px-2 py-0.5 rounded-md bg-foreground/[0.04]">
            Plan: {fmtDuration(totalExpected)}
          </span>
          {totalActual > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-foreground/[0.04]">
              Actual: {fmtDuration(totalActual)}
            </span>
          )}
        </div>

        {/* Clear all */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-destructive/70"
            onClick={() => { if (window.confirm('Clear all entries for this day?')) clearDay() }}
            title="Clear all entries for this day"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      </div>

      {/* Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
      <div className="flex-1 min-h-0 overflow-auto rounded-xl glass-thin">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr
              className="text-[11px] uppercase tracking-wider text-muted-foreground/60 select-none"
            >
              <th className="w-7 border-b border-white/[0.06]" />
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] min-w-[118px] w-[118px]">Start</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] min-w-[118px] w-[118px]">End</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[68px]">Total</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] min-w-[80px]">Activity</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] min-w-[118px] w-[118px]">Act. Start</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] min-w-[118px] w-[118px]">Act. End</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] w-[68px]">Act. Dur</th>
              <th className="text-left font-medium px-3 py-2.5 border-b border-white/[0.06] max-w-[120px]">Notes</th>
              <th className="w-8 border-b border-white/[0.06]" />
            </tr>
          </thead>
          <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <tbody>
            <AnimatePresence>
              {entries.map((entry, index) => (
                <TimetableRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={updateEntry}
                  onActualEndChange={handleActualEndChange}
                  onRemove={removeRow}
                  canRemove={entries.length > 1}
                  autofill={autofill}
                  entries={entries}
                  rowIndex={index}
                />
              ))}
            </AnimatePresence>
          </tbody>
          </SortableContext>
        </table>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeDragEntry && (
          <div
            className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-lg px-3 py-2 shadow-xl flex items-center gap-3 text-sm"
            style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15), 0 8px 24px -8px rgba(0,0,0,0.1)' }}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
            {activeDragEntry.plannedStart && (
              <span className="text-muted-foreground/60 tabular-nums text-xs">
                {activeDragEntry.plannedStart}–{activeDragEntry.plannedEnd}
              </span>
            )}
            <span className="font-medium truncate">
              {activeDragEntry.activityName || 'Untitled'}
            </span>
            {activeDragEntry.expectedMinutes > 0 && (
              <span className="text-muted-foreground/50 text-xs ml-auto flex-shrink-0">
                {fmtDuration(activeDragEntry.expectedMinutes)}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
      </DndContext>

      {/* Add row button */}
      <div className="mt-3 flex justify-start">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Row
          </Button>
        </motion.div>
      </div>

      {/* Autofill Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md glass-overlay">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Auto-Logic</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            {/* Autofill */}
            <div className="rounded-lg bg-foreground/[0.03] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground/80">Autofill</p>
                <button
                  onClick={() => setAutofill((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                    autofill
                      ? 'bg-emerald-400/70 dark:bg-emerald-500/50'
                      : 'bg-foreground/10'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      autofill ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>
              <p>
                Clicking an empty <em>Start</em> field auto-fills it from the previous row&apos;s
                end time (or the current time rounded to 5 min if no previous row exists).
                Tabbing into an empty <em>End</em> field carries over the start time&apos;s AM/PM
                so you only need to adjust the digits.
              </p>
            </div>

            {/* Autopush */}
            <div className="rounded-lg bg-foreground/[0.03] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground/80">Autopush</p>
                <button
                  onClick={() => setAutopush((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                    autopush
                      ? 'bg-sky-400/70 dark:bg-sky-500/50'
                      : 'bg-foreground/10'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      autopush ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>
              <p>
                Entering an <strong>Actual End</strong> time cascades all subsequent
                unfinished rows forward, preserving each activity&apos;s planned duration.
              </p>
            </div>

            {/* Always-on features */}
            <div className="rounded-lg bg-foreground/[0.03] p-3 space-y-2 text-xs">
              <p className="font-medium text-foreground/80">Always On</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground/70">
                <li>Expected &amp; actual durations auto-calculated from start/end times</li>
                <li>Variance notes auto-generated (over / under / on time)</li>
                <li>Changes auto-saved after 600ms</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

