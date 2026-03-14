# Academic Dashboard

A single-user academic task management dashboard built with Next.js 16, TypeScript, and shadcn/ui. Track lectures, assignments, and exam prep with deep work timers, weekly planning, a day-planner timetable, and time analytics — all running locally.

> **Version**: 1.9.6 &nbsp;|&nbsp; **Single-user, no auth** &nbsp;|&nbsp; **Runs on localhost:3000**

Two local persistence modes: **JSON files** (default, zero infrastructure) or **PostgreSQL** via Docker + Prisma.

---

## Features

- **Two main tabs** — Class Catch-up (task management) and Timetable (day planner)
- **Deep work timers** — per-task stopwatch with play/pause, localStorage persistence, idle-gap reconciliation, and `sendBeacon` flush on page unload
- **Task management** — CRUD, drag-and-drop reordering, duplicate, bulk delete, Today's Plan focus list
- **Timetable day planner** — excel-like schedule with planned vs actual time tracking, drag-and-drop row reorder, autofill (previous row's end time or rounded current time), autopush (cascade planned times when actual end is entered), and row completion animation
- **Weekly planning** — 7-day Mon–Sun grid with drag-to-assign, week navigation, and duplicate prevention
- **Categories** — color-coded course categories with sidebar filtering, search, inline rename (cascades to history)
- **Statistics** — task counts, due soon, overdue; Activity Summary with Today/All tabs; Time Records timeline with manual entry
- **Personal Dev Tracker** — independent timers for Reading, Project, Job App
- **Idle power-save** — 5 min inactivity unmounts heavy components; lightweight overlay with running timers
- **Landing sequence** — personalized cursive greeting animation on startup
- **Theme** — dark/light toggle, color scheme customization dialog
- **Data portability** — JSON export/import, bulk operations
- **API hardening** — Zod input validation on task/category/user-info endpoints, production guards on seed/bulk/delete-all routes, TypeScript strict mode (no `ignoreBuildErrors`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5.7, React 19 |
| **Styling** | Tailwind CSS 3.4, shadcn/ui (Radix primitives) |
| **Drag & Drop** | @dnd-kit (core + sortable) |
| **Animations** | Framer Motion 12 |
| **Forms** | React Hook Form + Zod |
| **Storage** | JSON files (`data/`) or PostgreSQL 16 + Prisma 7 |
| **Package Manager** | pnpm |

---

## Getting Started

### JSON Mode (Recommended)

```bash
./start.sh
```

No Docker needed. Installs deps, creates `data/`, starts dev server at [localhost:3000](http://localhost:3000).

### Database Mode

Requires Docker Desktop.

```bash
# Create .env
echo 'STORAGE_MODE=postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academic_dashboard"' > .env

./db_start.sh
```

### Manual

```bash
pnpm install
STORAGE_MODE=json pnpm dev       # or STORAGE_MODE=postgres (after docker compose up -d && pnpm prisma migrate deploy)
```

### Migrating PostgreSQL → JSON

```bash
npx tsx scripts/migrate-db-to-json.ts && ./start.sh
```

---

## Architecture

```
Browser (React client)
  ├── React useState in app/page.tsx (root state, no external state lib)
  ├── localStorage (timers, today panel, day boundaries)
  └── fetch() / sendBeacon → API routes
                                ↓
                          lib/db.ts (storage factory)
                           ├── lib/json-db.ts → data/*.json
                           └── lib/prisma.ts  → PostgreSQL
```

### Component Tree

```
Home (app/page.tsx)
  ├── LandingSequence
  ├── IdleOverlay
  ├── Tab: Class Catch-up
  │    ├── DndContext
  │    │    ├── CategorySidebar
  │    │    ├── WeeklyPlan
  │    │    ├── TaskList → TaskRow
  │    │    └── TodayPanel (useTaskTimers, PersonalDevTracker)
  │    └── Stats
  ├── Tab: Timetable
  │    └── Timetable (drag-and-drop, autofill, autopush)
  └── Dialogs (AddTask, EditTask, ActivitySummary, TimeRecords, ColorScheme, ClearData, Import)
```

### Hooks

| Hook | Purpose |
|---|---|
| `useTaskTimers` | Per-task timers, localStorage-backed, `sendBeacon` on unload, idle-gap reconciliation |
| `useIdleDetector` | 5-min inactivity → power-save mode (Page Visibility API aware) |

---

## API Routes

All routes use `lib/db.ts` — never direct DB calls.

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/tasks` | List / create tasks (POST has Zod validation) |
| `DELETE` | `/api/tasks` | Bulk delete all tasks (production-guarded) |
| `PATCH/DELETE` | `/api/tasks/[id]` | Update / delete a task |
| `POST` | `/api/tasks/reorder` | Bulk reorder |
| `GET/POST` | `/api/categories` | List / create (POST has Zod validation) |
| `PATCH/DELETE` | `/api/categories/[id]` | Update (rename cascades) / delete (cascades tasks) |
| `GET/POST` | `/api/completed-tasks` | List (excludes soft-deleted) / create snapshot |
| `PATCH` | `/api/completed-tasks/[id]` | Soft-delete / restore |
| `DELETE` | `/api/completed-tasks/cleanup` | Purge records soft-deleted >3 days |
| `GET/POST` | `/api/time-records` | List by date window / create |
| `PATCH/DELETE` | `/api/time-records/[id]` | Update / delete |
| `GET/POST/PUT` | `/api/timetable` | Get by date / create entry / bulk replace |
| `GET/POST/DELETE` | `/api/weekly-plan` | Get week / assign task / remove entry |
| `GET/PUT` | `/api/user-info` | Get / upsert display name (PUT has Zod validation) |
| `POST` | `/api/seed` | One-time DB seed (production-guarded) |
| `POST` | `/api/bulk` | Clear / import (production-guarded) |

---

## Data Models

7 models, identical across both storage modes:

| Model | Purpose |
|---|---|
| **Category** | Course categories (name, color, order). Has many Tasks. |
| **Task** | Active tasks (title, type, dueAt, priorityOrder, estimatedDuration). Belongs to Category. |
| **CompletedTask** | Denormalized snapshot. Soft-delete via `deletedAt`. Stores names directly so history survives deletion. |
| **TimeRecord** | Study session records (start, end, duration). Denormalized — survives task/category deletion. |
| **WeeklyPlanEntry** | Task ↔ date with unique constraint. Cascades on task delete. |
| **TimetableEntry** | Day-planner rows (planned/actual start/end, durations, activity, notes). |
| **UserInfo** | Singleton (id="default") storing display name. |

JSON Mode files: `data/{categories,tasks,completed-tasks,time-records,weekly-plan,timetable,user-info}.json`

---

## Scripts

| Command | Description |
|---|---|
| `./start.sh` | JSON Mode startup (no Docker) |
| `./db_start.sh` | Database Mode startup (Docker + migrations) |
| `pnpm dev:json` | Dev server in JSON mode |
| `pnpm dev:postgres` | Dev server in Database mode |
| `pnpm build` | Production build (TypeScript errors fail the build) |
| `pnpm migrate:json` | Export PostgreSQL → JSON files |

---

## License

MIT

