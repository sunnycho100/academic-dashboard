# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
