# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Version descriptions should be professional and concise, briefly mentioning key technical implementations (e.g., "Timer accuracy improvements via PostgreSQL pipeline optimization", "Authentication system with JWT middleware", "Real-time updates through WebSocket integration").

## [1.6.1] - 2026-02-16

### Fixed
- Time Records timeline blocks: corners now clip properly during animation by applying `rounded-xl` to inner glass layers
- Weekly Plan column height limited to ~3 tasks (112px max-height) to prevent expanding beyond viewport and hiding Task List / Today's Plan
- Task row badge alignment restored: fixed widths (68px category, 68px type, 44px duration) for consistent overdue badge positioning across rows

## [1.6.0] - 2026-02-16
Glassmorphism UI overhaul, category management, time records polish, activity summary sync

### Added
- Category Edit mode — replaces Remove button; enables inline rename, reorder (up/down arrows), and delete in one unified interface
- Category rename cascades to `CompletedTask` and `TimeRecord` tables via API — historical data stays consistent across all views
- Category reorder via arrow buttons with persistent `order` field update to PostgreSQL
- Time Records `+` button in header for quick manual entry without entering edit mode
- Inline add form in timeline view with optimistic insert (no refresh flash)
- Activity Summary day boundary sync — reads `timeRecords-dayBoundaries` from localStorage so "Today" filter matches time records configuration
- Logical day boundary support with `getLogicalDayStart` — tasks completed at 2 AM correctly group under the previous logical day

### Changed
- Full glassmorphism design system applied across all components — glass-thick, glass-thin, glass-overlay, glass-rim tiers with CSS custom properties
- Glass polish pass: `::after` inset top highlights on glass surfaces, directional rim borders (top/left brighter, bottom/right dimmer)
- Badge variants updated to translucent glass (e.g. `bg-red-500/10 backdrop-blur-sm` for destructive)
- Time Records dialog redesigned with glassmorphism:
  - Metric cards with gradient backgrounds, glass layering, inset highlights, uppercase labels
  - Timeline blocks with glass overlay, left accent bar with glow, gradient-to-transparent surfaces
  - Current time indicator with gradient line and glow effect
  - Refined typography with tighter tracking and improved hierarchy
  - Hour grid labels and lines adjusted for dark glass aesthetic
  - Date pill with gradient highlight for today
- Theme toggle simplified to single-click light/dark switch (no dropdown)
- Task row alignment fix: category name (80px), task type (72px), duration (48px) with fixed widths and truncate
- Custom dialogs (add-task, edit-task, time-records, color-scheme) converted to glass-overlay with `bg-black/40` backdrop
- Overlay transparency increased (~82% light / ~88% dark) for readability on floating components
- Category sidebar Edit mode hides "All Categories" to prevent accidental navigation

### Fixed
- Dropdown/select menus too transparent — `.glass-overlay` class with higher opacity
- Add-task and time-record dialogs appearing too dark — standardized to glass-overlay
Weekly planning system with PostgreSQL-backed task scheduling and 7-day grid interface

### Added
- Weekly Plan — collapsible panel above Task List and Today's Plan for planning tasks across the week
- 7-day grid layout (Mon–Sun) with task assignment via searchable dropdown grouped by category
- Week navigation with previous/next arrows and click-to-reset to current week
- Today column highlighting with visual indicator
- `WeeklyPlanEntry` Prisma model with unique constraint on task+date (prevents duplicates)
- `GET /api/weekly-plan?weekStart=YYYY-MM-DD` — fetch entries for a 7-day window with full task + category data
- `POST /api/weekly-plan` — assign a task to a specific day
- `DELETE /api/weekly-plan` — remove a weekly plan entry
- Cascade delete: weekly plan entries auto-removed when parent task is deleted

## [1.4.2] - 2026-02-15
Timer display accuracy and study time source of truth

### Fixed
- Personal Dev Timer HH:MM display now accurate — eliminated elapsedSeconds accumulator that caused drift by computing display from DB totals + live segment elapsed instead
- Study Time now reflects actual study time based on user's configured day start/end boundaries — fetches all time records for today from database instead of completed task minutes, polls every 30s to stay fresh
- getDueInfo function now properly handles nullable dueAt field (prevents TypeScript errors for tasks without due dates)

## [1.4.1] - 2026-02-15
Optional due dates, manual time entry, color scheme settings, timeline fix

### Added
- Optional due date — tasks can now be created/edited without a due date (e.g. "Review Notes")
- Tasks without due dates show "No due date" outline badge, excluded from overdue/due-soon filters, sorted to end
- Manual time record entry — "Add Record Manually" form in Time Records edit mode with quick-pick presets for Personal Dev activities (Reading, Project, Job App)
- Manual Personal Dev entries update localStorage timer and reflect in Personal Dev Tracker elapsed time
- Personal Dev Tracker now hydrates elapsed time from database on mount (source of truth)
- Color Scheme dialog — accessible from Settings gear menu, allows changing colors for course categories (persisted to DB) and Personal Dev activities (persisted to localStorage)
- `PATCH /api/time-records/[id]` — update time record fields (title, start/end time, auto-recalculated duration)
- `DELETE /api/time-records/[id]` — delete individual time records

### Changed
- `dueAt` field now nullable in both `Task` and `CompletedTask` Prisma models (migration: `make_due_date_optional`)
- `dueAt` type changed from `string` to `string | null` in TypeScript `Task` interface
- Add Task / Edit Task forms no longer require due date to submit
- Personal Dev Tracker colors now dynamic via localStorage instead of hardcoded Tailwind classes
- Time Records quick-pick presets read colors from Color Scheme settings
- Removed standalone color picker from Time Records manual add form (managed via Color Scheme dialog instead)

### Fixed
- Timeline block rendering bug: zero-duration records (e.g. accidental click 3:39 PM → 3:39 PM) no longer expand to fill the rest of the day — changed `endHour <= startHour` to strict `endHour < startHour` in `getBlockPosition`
- Tasks with null `dueAt` no longer crash `task-row.tsx` (`new Date(null)` guard)
- API routes handle null `dueAt` in POST/PATCH for tasks and completed-tasks
- Stale Prisma client cache causing null `dueAt` inserts to fail silently (server restart required after migration)

## [1.4.0] - 2026-02-15
Personal Development tracker and Task List redesign

### Added
- Personal Development tracker with 3 activity timers (Reading, Project, Job Application)
- Independent timers with start/pause functionality that save segments to time records
- HH:MM format timer display (no seconds)
- Time records integration — personal dev activities appear in Time Records timeline

### Changed
- Task List redesigned as card container with header and scroll area (matching Today's Plan style)
- Task List now scrolls within fixed container instead of expanding infinitely

## [1.3.0] - 2026-02-15
Soft delete for completed tasks with 3-day grace period

### Added
- `deletedAt` field to `CompletedTask` model for soft delete functionality
- Settings button in Activity Summary dialog header to toggle delete mode
- Delete mode UI with checkboxes for selecting completed tasks to delete
- "Delete Selected" action to soft delete completed tasks (sets `deletedAt` timestamp)
- `PATCH /api/completed-tasks/[id]` — soft delete or restore individual tasks
- `DELETE /api/completed-tasks/cleanup` — permanently deletes tasks soft-deleted >3 days ago
- Auto-cleanup on app load: permanently removes tasks deleted >3 days ago
- Visual feedback: selected tasks show ring highlight in delete mode

### Changed
- `GET /api/completed-tasks` now filters out soft-deleted tasks (where `deletedAt IS NOT NULL`)
- Activity Summary stats hidden when in delete mode to focus on task management

## [1.2.0] - 2026-02-14
Full PostgreSQL persistence for tasks & categories, overdue date fix

### Added
- `Task` and `Category` Prisma models — current tasks now stored in PostgreSQL
- Full CRUD API routes: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/[id]`
- Full CRUD API routes: `GET/POST /api/categories`, `PATCH/DELETE /api/categories/[id]`
- `POST /api/tasks/reorder` — persists drag-and-drop priority order changes
- `POST /api/bulk` — bulk clear and import operations via database
- `POST /api/seed` — one-time migration from localStorage to PostgreSQL
- Automatic localStorage-to-DB seed on first load (maps old IDs to new UUIDs)
- Cascade delete: removing a category deletes all its tasks in DB

### Changed
- All task/category CRUD operations now persist to PostgreSQL (optimistic UI updates)
- Export/Import uses database as source of truth
- Clear Data now wipes both localStorage and PostgreSQL

### Fixed
- Overdue date comparison bug: `new Date('YYYY-MM-DD')` parses as UTC midnight, causing same-day tasks to appear overdue in western timezones — now uses `.getTime()` comparisons and local time parsing via `'T00:00:00'` suffix
- Due date 2/14 no longer marked overdue when today is 2/14

## [1.1.0] - 2026-02-14
PostgreSQL persistence, Activity Summary tabs, study time fix

### Added
- PostgreSQL database via Docker + Prisma 7 ORM for completed task archive
- `POST /api/completed-tasks` — persists task on completion with time analytics
- `GET /api/completed-tasks` — retrieves full completion history
- Activity Summary dialog with Today / All tabs (system clock-based filtering)
- All tab groups completed tasks by day with section headers
- Time difference tracking: estimated vs actual (saved / over indicators)
- Completed task info on task-row (actual time + saved/over badge)
- Study Time footer now pulls today's completed sessions from PostgreSQL

### Changed
- Activity Summary stats update per active tab (Today or All)
- Study Time includes DB-archived completed tasks, not just live timers
- Updated README with PostgreSQL setup, hybrid storage architecture, study time docs
- Updated project structure in README

### Fixed
- Study Time showing 00:00 when tasks were completed (now fetches from DB)

## [1.0.0] - 2026-02-14
Initial release — full academic dashboard with deep work timer

### Added
- ✅ Complete academic task management dashboard
- ✅ Task CRUD operations (Create, Read, Update, Delete)
- ✅ Category management with color coding
- ✅ Drag and drop task reordering
- ✅ Two view modes: "Due Soon" and "Overdue / Catch-up"
- ✅ Smart task sorting (by due date or manual order)
- ✅ Group tasks by category
- ✅ Task types: Lecture, Discussion, Lab, Assignment, Exam Prep
- ✅ Statistics dashboard showing:
  - Total tasks
  - Completed tasks
  - Tasks due soon
  - Overdue tasks
- ✅ Theme toggle (Light/Dark mode)
- ✅ Data export to JSON
- ✅ Data import from JSON
- ✅ Clear all data functionality
- ✅ Local storage persistence
- ✅ Task notes with tooltip preview
- ✅ Category search in sidebar
- ✅ Empty state with onboarding guide
- ✅ Smart due date indicators with color coding:
  - Red: Overdue or due today
  - Default: Due tomorrow
  - Secondary: Due in 2+ days
- ✅ Task status toggle (Todo/Done)
- ✅ Task duplication
- ✅ Responsive design
- ✅ Sample data for quick start

### UI Components
- Task list with drag and drop
- Category sidebar with search
- Add/Edit task sheets
- Add category dialog
- Statistics cards
- Theme toggle dropdown
- Settings menu with export/import/clear options
- Empty state component
- Clear data confirmation dialog
- Import data dialog

### Technical Features
- Built with Next.js 16 and App Router with Turbopack
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui component library
- @dnd-kit for drag and drop
- Framer Motion for animations
- date-fns for date utilities
- next-themes for theme management
- Local storage for data persistence
- No backend required - fully client-side

### Documentation
- Comprehensive README.md
- Usage tips and examples
- Project structure documentation
- Customization guide
- Tech stack overview
