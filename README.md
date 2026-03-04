# Academic Dashboard

A modern academic task management system built with Next.js, TypeScript, and shadcn/ui. Designed for students to track lectures, assignments, labs, discussions, and exam preparation with deep work timer integration, weekly planning, and time analytics — all running locally.

> **Version**: 1.7.2 &nbsp;|&nbsp; **Single-user, no auth** &nbsp;|&nbsp; **Runs entirely on localhost**

The app supports two local persistence strategies:
1. **JSON Mode** (default) — flat JSON files in `data/`, zero infrastructure
2. **Database Mode** — PostgreSQL via Docker + Prisma ORM

---

## Features

### Dashboard Overview
- **Statistics Cards**: Quick overview of total tasks, completed tasks, tasks due soon, and overdue items
- **View Modes**:
  - **All Tasks**: Complete view of your academic workload
  - **Overdue**: Focus on tasks requiring immediate attention
  - **Due Soon**: Preview upcoming deadlines

### Deep Work Timer
- **Stopwatch Integration**: Track time spent on each task with play/pause controls
- **Persistent Timers**: Timer state saved across sessions via localStorage; elapsed time reconciled after idle gaps
- **Activity Summary**: View completed tasks with Today / All tabs, grouped by day
- **Study Time Analytics**: Live study time footer combining active timers + today's completed sessions from PostgreSQL
- **Time Difference Tracking**: Compare estimated vs actual time (saved / over indicators)
- **Beacon Flush**: Running timer segments are flushed via `navigator.sendBeacon` on page unload to prevent data loss

### Task Management
- **Create Tasks**: Add tasks with title, category, type, due date, estimated duration, and notes
- **Edit Tasks**: Modify existing tasks seamlessly
- **Duplicate Tasks**: Quick duplication for similar assignments
- **Delete Tasks**: Remove completed or unwanted items
- **Task Status**: Mark tasks complete with timer integration
- **Drag & Drop**: Manual task reordering (available in manual sort mode) and drag tasks into Today's Plan
- **Today's Plan**: Curated focus list with glassmorphism Bento card design

### Weekly Planning
- **7-Day Grid**: Visual Mon–Sun planning grid with week navigation (prev/next)
- **Task Assignment**: Drag or assign tasks to specific days
- **Duplicate Prevention**: Unique constraint prevents assigning the same task to the same day
- **Cascading Deletes**: Entries auto-remove when their parent task is deleted

### Categories
- **Custom Categories**: Create categories for your classes (e.g., COMPSCI400, MATH340)
- **Color-Coded**: Unique color assignment for easy visual identification
- **Filter by Category**: View tasks for specific courses
- **Category Search**: Quick navigation through the sidebar
- **Rename Cascade**: Renaming a category updates all completed task and time record history

### Task Types
- Lecture
- Discussion
- Lab
- Assignment
- Exam Prep

### Advanced Features
- **Smart Sorting**: Sort by due date or manual ordering via drag & drop
- **Group by Category**: Organize tasks by course
- **Theme Toggle**: Switch between light and dark modes
- **Color Scheme Customization**: Adjustable color scheme via dialog
- **Data Export**: Export data as JSON for backup
- **Data Import**: Restore from previous exports
- **Bulk Operations**: Clear all data or bulk import via API
- **Landing Sequence**: Personalized greeting animation with typewriter effect on startup
- **Idle Power-Save Mode**: After 5 min of inactivity, unmounts heavy components and shows a lightweight overlay with current time, date, and running timers — any interaction restores the full dashboard
- **Personal Dev Tracker**: Separate timer system for non-academic activities (Reading, Project, Job App)

### Smart Indicators
- Color-coded due date badges:
  - **Pastel Red**: Overdue or due today
  - **Default**: Due tomorrow
  - **Secondary**: Due in 2+ days
- Displays exact days until due date or days overdue
- Live timer display with pulsing animation when active

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) — App Router, Turbopack (`next dev --turbo`) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.7 |
| **Runtime** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 3.4 + `tailwindcss-animate` |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) (core + sortable) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) 12 |
| **Charts** | [Recharts](https://recharts.org/) 2.15 |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation |
| **Theme** | [next-themes](https://github.com/pacocoursey/next-themes) (class-based dark mode) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Storage (JSON)** | Flat JSON files in `data/` — zero infrastructure |
| **Storage (DB)** | [PostgreSQL 16](https://www.postgresql.org/) Alpine via Docker |
| **ORM** | [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapter + raw `pg.Pool` |
| **Toasts** | [Sonner](https://sonner.emilkowal.dev/) |
| **Package Manager** | [pnpm](https://pnpm.io/) |

---

## Deployment Modes

The dashboard supports two persistence modes. The UI, API routes, and application logic are **identical** — only the data layer differs.

| | JSON Mode | Database Mode |
|---|---|---|
| **Storage** | Flat JSON files (`data/`) | PostgreSQL 16 (Docker) |
| **Setup** | `./start.sh` | `./db_start.sh` |
| **Requires Docker** | No | Yes |
| **Requires Prisma** | No | Yes |
| **Best for** | Students, demos, portability | Full persistence, analytics |
| **Env var** | `STORAGE_MODE=json` | `STORAGE_MODE=postgres` |

### Storage Layer Architecture

The difference between modes is only the data persistence backend. The API routes import from a single abstraction (`lib/db.ts`) that selects the right implementation at startup:

```
UI (React)
  ↓
API Routes (Next.js)
  ↓
lib/db.ts ── Storage Factory
  ├── lib/json-db.ts      ← JSON Mode:   read/write data/*.json
  └── lib/prisma.ts       ← DB Mode:     PrismaClient → PostgreSQL
```

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  React State  │   │ localStorage │   │  fetch() /  │ │
│  │  (useState)   │◄─►│  (timers,    │   │  sendBeacon │ │
│  │              │   │   today,     │   │             │ │
│  │              │   │   day bounds)│   │             │ │
│  └──────┬───────┘   └──────────────┘   └──────┬──────┘ │
│         │                                      │        │
└─────────┼──────────────────────────────────────┼────────┘
          │          HTTP (localhost:3000)        │
┌─────────┼──────────────────────────────────────┼────────┐
│         ▼         Next.js API Routes           ▼        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/tasks    /api/categories    /api/seed       │   │
│  │  /api/completed-tasks   /api/time-records         │   │
│  │  /api/weekly-plan   /api/user-info   /api/bulk    │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│               ┌─────────▼──────────┐                     │
│               │    lib/db.ts       │                     │
│               │  (storage factory) │                     │
│               └──┬──────────┬──────┘                     │
│     ┌────────────▼──┐  ┌────▼────────────────────┐       │
│     │  JSON files   │  │ Prisma + PostgreSQL 16  │       │
│     │  data/*.json  │  │ (Docker container)      │       │
│     └───────────────┘  └─────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Client Architecture

The entire UI is a **client component** tree rooted at `app/page.tsx`. No server components are used for data fetching — all data loads client-side via `useEffect` + `fetch`. The API routes are the server-side layer.

**State management** uses plain React `useState` in the root `Home` component (no external state library, no React Context for data — only `ThemeProvider` for dark mode). State is passed down as props.

### Component Hierarchy

```
RootLayout (server) → ThemeProvider
  └─ Home (client — app/page.tsx)     ← root state owner
       ├─ LandingSequence             ← startup greeting animation
       ├─ IdleOverlay                 ← power-save screen (5 min idle)
       ├─ DndContext                  ← global drag-and-drop
       │    ├─ CategorySidebar        ← course filter + management
       │    ├─ WeeklyPlan             ← 7-day planning grid
       │    ├─ TaskList → TaskRow     ← main task listing
       │    ├─ TodayPanel             ← today's plan + timers
       │    │    ├─ useTaskTimers hook
       │    │    └─ PersonalDevTracker
       │    └─ DragOverlay
       ├─ Stats                       ← statistics display
       ├─ AddCategoryDialog
       ├─ AddTaskSheet / EditTaskSheet
       ├─ ActivitySummaryDialog
       ├─ TimeRecordsDialog
       ├─ ColorSchemeDialog
       ├─ ClearDataDialog
       └─ ImportDataDialog
```

### Custom Hooks

| Hook | Purpose |
|---|---|
| `useTaskTimers` | Per-task start/pause/resume/stop timers. Stores state in localStorage. Reconciles elapsed time after idle gaps by comparing `lastTickAt`. Flushes completed segments to `/api/time-records`. Uses `sendBeacon` on `beforeunload`. |
| `useIdleDetector` | Detects 5 min of inactivity (mousemove, keyboard, scroll, touch, pointer). Respects Page Visibility API. When idle, the heavy component tree unmounts for power saving. |

### Data Flow

1. **On mount**: Fetches `/api/categories` + `/api/tasks` in parallel
2. **One-time migration**: If DB is empty, calls `/api/seed` with localStorage data (legacy migration path)
3. **All CRUD**: `fetch()` calls → Next.js API routes → `lib/db.ts` → JSON files or PostgreSQL
4. **Timer segments**: Stored in localStorage while running; POSTed to `/api/time-records` on pause/stop/unload
5. **Auto-cleanup**: On load, `DELETE /api/completed-tasks/cleanup` purges soft-deleted records older than 3 days

---

## API Reference

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks ordered by `priorityOrder` |
| `POST` | `/api/tasks` | Create a new task |
| `PATCH` | `/api/tasks/[id]` | Update a task's fields |
| `DELETE` | `/api/tasks/[id]` | Delete a task |
| `POST` | `/api/tasks/reorder` | Bulk update `priorityOrder` (transactional) |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | List all categories ordered by `order` |
| `POST` | `/api/categories` | Create a new category |
| `PATCH` | `/api/categories/[id]` | Update a category (name rename cascades to history) |
| `DELETE` | `/api/categories/[id]` | Delete a category (cascades tasks via FK) |

### Completed Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/completed-tasks` | List all (soft-delete aware, `deletedAt IS NULL`) |
| `POST` | `/api/completed-tasks` | Create a completed task snapshot |
| `PATCH` | `/api/completed-tasks/[id]` | Soft-delete/restore or update fields |
| `DELETE` | `/api/completed-tasks/cleanup` | Permanently delete records soft-deleted >3 days ago |

### Time Records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/time-records` | List records for a date window (`date`, `tz`, `startHour`, `endHour`) |
| `POST` | `/api/time-records` | Create a time record (clamps `duration >= 0`) |
| `PATCH` | `/api/time-records/[id]` | Update a record (auto-recalculates duration) |
| `DELETE` | `/api/time-records/[id]` | Delete a time record |

### Weekly Plan

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/weekly-plan` | Get entries for a 7-day window (`weekStart` param) |
| `POST` | `/api/weekly-plan` | Assign a task to a day (409 on duplicate) |
| `DELETE` | `/api/weekly-plan` | Remove a weekly plan entry by `id` |

### Other

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user-info` | Get user display name |
| `PUT` | `/api/user-info` | Upsert user display name |
| `POST` | `/api/seed` | One-time DB seeding from localStorage (idempotent) |
| `POST` | `/api/bulk` | Bulk operations: `clear` (delete all) or `import` (clear + re-import) |

---

## Data Models

6 models, used identically in both JSON and Database modes:

| Model | Purpose |
|---|---|
| **Category** | Course categories (name, color, order). Has many Tasks. |
| **Task** | Active tasks (title, type, dueAt, status, priorityOrder, estimatedDuration, actualTimeSpent). Belongs to Category. |
| **CompletedTask** | Denormalized snapshot of completed tasks. Soft-delete via `deletedAt`. Auto-computed `timeDifference`. |
| **TimeRecord** | Study session records (startTime, endTime, duration in seconds). Denormalized task/category metadata survives deletion. |
| **WeeklyPlanEntry** | Task ↔ date assignment with unique constraint. Cascades on task delete. |
| **UserInfo** | Singleton record (id="default") storing display name. |

> **Design note**: `CompletedTask` and `TimeRecord` are intentionally denormalized — they store category/task names directly so history survives task and category deletion.

In **JSON Mode**, each model maps to a file in `data/`:

```
data/
├── categories.json
├── tasks.json
├── completed-tasks.json
├── time-records.json
├── weekly-plan.json
└── user-info.json
```

In **Database Mode**, models are managed via Prisma schema and migrations in `prisma/`.

---

## Data Storage

### Server-Side Persistence

Controlled by `STORAGE_MODE` environment variable:

| Mode | Backend | Files / DB |
|---|---|---|
| `json` (default) | `lib/json-db.ts` | `data/*.json` |
| `postgres` | `lib/prisma.ts` | PostgreSQL 16 via Docker |

### Client-Side (localStorage)

Both modes use localStorage for UI-only state:

| Key | Purpose |
|---|---|
| `class-catchup-data` | Legacy fallback: full categories + tasks |
| `class-catchup-today` | Today Panel task IDs |
| `class-catchup-timers` | Timer states per task (isRunning, isPaused, elapsedSeconds, segmentStartedAt, lastTickAt) |
| `personal-dev-timers` | Personal Dev tracker timer states |
| `timeRecords-dayBoundaries` | Logical day boundary config (`{start, end}` hours) |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** (recommended; auto-installed by `start.sh` if missing)
- **Docker** (only for Database Mode)

### Option A — JSON Mode (Recommended)

No Docker required. Data stored in `data/*.json` files.

```bash
./start.sh
```

That's it. The script installs dependencies, creates the `data/` directory, and starts the dev server. Open [http://localhost:3000](http://localhost:3000).

### Option B — Database Mode

Requires Docker Desktop running.

1. Create a `.env` file:
```env
STORAGE_MODE=postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academic_dashboard"
USER_NAME="Your Name"
```

2. Launch:
```bash
./db_start.sh
```

This script starts PostgreSQL via Docker, runs Prisma migrations, and starts the dev server.

### Migrating from Database Mode to JSON Mode

If you already have data in PostgreSQL and want to switch to JSON Mode:

```bash
# Ensure Docker + PostgreSQL are running
npx tsx scripts/migrate-db-to-json.ts

# Then start in JSON mode
./start.sh
```

This exports all categories, tasks, completed tasks, time records, weekly plans, and user info into `data/*.json`.

### Manual Installation

```bash
pnpm install

# JSON Mode
STORAGE_MODE=json pnpm dev

# Database Mode
docker compose up -d
pnpm prisma migrate deploy
STORAGE_MODE=postgres pnpm dev
```

### Build for Production

```bash
pnpm build
STORAGE_MODE=json pnpm start    # or STORAGE_MODE=postgres
```

---

## Project Structure

```
academic-dashboard/
├── app/
│   ├── page.tsx               # Root client component — all state lives here
│   ├── layout.tsx             # Server layout with ThemeProvider, fonts, metadata
│   ├── globals.css            # CSS variables, glassmorphism classes, mesh gradients
│   └── api/
│       ├── tasks/
│       │   ├── route.ts       # GET, POST
│       │   ├── [id]/route.ts  # PATCH, DELETE
│       │   └── reorder/route.ts
│       ├── categories/
│       │   ├── route.ts       # GET, POST
│       │   └── [id]/route.ts  # PATCH (with rename cascade), DELETE
│       ├── completed-tasks/
│       │   ├── route.ts       # GET, POST
│       │   ├── [id]/route.ts  # PATCH (soft-delete/restore)
│       │   └── cleanup/route.ts
│       ├── time-records/
│       │   ├── route.ts       # GET, POST
│       │   └── [id]/route.ts  # PATCH, DELETE
│       ├── weekly-plan/route.ts
│       ├── user-info/route.ts
│       ├── seed/route.ts
│       └── bulk/route.ts
├── components/
│   ├── personal-dev-tracker.tsx  # Non-academic timer system
│   ├── landing-sequence.tsx      # Welcome animation (Great Vibes font)
│   ├── idle-overlay.tsx          # Power-save mode (pure CSS, minimal deps)
│   ├── category-sidebar.tsx      # Course filter + management
│   ├── weekly-plan.tsx           # 7-day planning grid
│   ├── today-panel.tsx           # Today's plan + stopwatch timers
│   ├── task-list.tsx / task-row.tsx
│   ├── stats.tsx                 # Statistics cards
│   ├── activity-summary-dialog.tsx
│   ├── time-records-dialog.tsx
│   ├── add-task-sheet.tsx / edit-task-sheet.tsx
│   ├── add-category-dialog.tsx
│   ├── color-scheme-dialog.tsx
│   ├── clear-data-dialog.tsx / import-data-dialog.tsx
│   ├── theme-toggle.tsx / theme-provider.tsx
│   └── ui/                      # shadcn/ui component library
├── hooks/
│   ├── use-task-timer.ts         # Stopwatch hook with localStorage + sendBeacon
│   ├── use-idle-detector.ts      # 5-min inactivity detection
│   └── use-toast.ts
├── lib/
│   ├── db.ts                     # Storage factory — selects JSON or Prisma backend
│   ├── json-db.ts                # JSON file-backed database (JSON Mode)
│   ├── prisma.ts                 # Singleton PrismaClient (Database Mode)
│   ├── types.ts                  # TypeScript type definitions
│   ├── store.ts                  # localStorage management + sample data
│   ├── utils.ts                  # Utility functions (cn, date helpers)
│   ├── liquidTransitions.ts      # Transition animation utilities
│   └── generated/prisma/         # Prisma generated client
├── data/                          # JSON Mode data files
│   ├── categories.json
│   ├── tasks.json
│   ├── completed-tasks.json
│   ├── time-records.json
│   ├── weekly-plan.json
│   └── user-info.json
├── scripts/
│   └── migrate-db-to-json.ts     # Export PostgreSQL → JSON files
├── prisma/
│   ├── schema.prisma             # 6 models: Category, Task, CompletedTask, etc.
│   └── migrations/               # Migration history
├── docker-compose.yml            # PostgreSQL 16 Alpine container
├── prisma.config.ts              # Prisma config (datasource URL from .env)
├── start.sh                      # JSON Mode startup script
├── db_start.sh                   # Database Mode startup script
├── tailwind.config.ts
└── package.json
```

---

## Styling & Theming

- **Dark mode** by default, togglable via class-based switching (`next-themes`)
- **Glassmorphism design system**: Custom CSS classes (`.glass-thick`, `.glass-thin`, `.glass-overlay`) with dedicated CSS custom properties
- **Mesh gradient background**: Multi-layered radial gradients with light/dark variants
- **Fonts**: Geist (sans), Geist Mono (mono), Great Vibes (cursive for landing greeting)
- **CSS variables**: Full shadcn/ui variable set in `:root` (light) and `.dark` (dark)

---

## Usage Guide

### Getting Started
1. **Create Categories**: Set up categories for all your classes
2. **Add Tasks**: Input assignments, lectures, and labs as they're assigned
3. **Today's Plan**: Add priority tasks to your daily focus list using the chevron button
4. **Start Timer**: Click play on tasks in Today's Plan to track deep work time
5. **Complete Tasks**: Click the check button to mark complete and save time spent

### Daily Workflow
1. Review the **Due Soon** tab to preview upcoming work
2. Check **Overdue** tab for items requiring immediate attention
3. Add high-priority tasks to **Today's Plan**
4. Use the **deep work timer** to track focused study sessions
5. Review **Activity Summary** to monitor productivity

### Weekly Planning
1. Open the **Weekly Plan** view
2. Navigate between weeks with prev/next arrows
3. Assign tasks to specific days by dragging or clicking
4. View your planned workload across the week at a glance

### Best Practices
- Switch to manual sort and drag tasks to prioritize effectively
- Export data regularly using the export feature for backup
- Enable "Group by category" when focusing on specific courses
- Use estimated duration to plan study sessions
- Review Activity Summary weekly to track study patterns

---

## Customization

### Adding New Task Types

Edit [lib/types.ts](lib/types.ts):
```typescript
export type TaskType = 'Lecture' | 'Discussion' | 'Lab' | 'Assignment' | 'Exam Prep' | 'YourType'
```

### Modifying Theme Colors

Edit [app/globals.css](app/globals.css) to customize CSS variables for light and dark themes.

### Adjusting Sample Data

Edit [lib/store.ts](lib/store.ts) to modify initial categories and tasks for new installations.

---

## Scripts

| Command | Description |
|---|---|
| `./start.sh` | JSON Mode startup (no Docker) |
| `./db_start.sh` | Database Mode startup (Docker + migrations + dev server) |
| `pnpm dev` | Start dev server with Turbopack (uses `STORAGE_MODE` env) |
| `pnpm dev:json` | Start dev server in JSON mode |
| `pnpm dev:postgres` | Start dev server in Database mode |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm migrate:json` | Export PostgreSQL data → JSON files |
| `pnpm prisma migrate deploy` | Apply pending DB migrations |
| `pnpm prisma generate` | Regenerate Prisma client |
| `pnpm prisma studio` | Open Prisma Studio (DB GUI) |

---

## License

MIT

## Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Drag and drop by [@dnd-kit](https://dndkit.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Charts by [Recharts](https://recharts.org/)
- Form validation by [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

