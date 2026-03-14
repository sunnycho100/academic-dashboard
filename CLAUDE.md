# CLAUDE.md — Academic Dashboard

## What This Project Is
A single-user academic task management dashboard. No auth, no multi-tenancy.
Runs locally on localhost:3000. Version 1.7.2.

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.7 + React 19
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **Drag & Drop**: @dnd-kit
- **Animations**: Framer Motion 12
- **Forms**: React Hook Form + Zod
- **Package Manager**: pnpm (always use pnpm, never npm/yarn)

## Storage Architecture (Critical)
Two modes controlled by `STORAGE_MODE` env var. The API routes and UI are identical — only the data layer differs.

lib/db.ts (storage factory)
  ├── lib/json-db.ts   → STORAGE_MODE=json   → data/*.json files
  └── lib/prisma.ts    → STORAGE_MODE=postgres → PostgreSQL 16 (Docker)

**Never bypass lib/db.ts.** All reads/writes go through it. Do not write directly to JSON files or call PrismaClient directly from API routes.

JSON mode files: data/categories.json, tasks.json, completed-tasks.json, time-records.json, weekly-plan.json, user-info.json

## Key Architectural Rules
- All state lives in app/page.tsx (root client component). No external state library, no React Context for data.
- No server components used for data fetching — everything loads client-side via useEffect + fetch()
- Timer state lives in localStorage (class-catchup-timers). Completed segments flush to /api/time-records via sendBeacon on unload.
- CompletedTask and TimeRecord are intentionally denormalized — they store names directly so history survives deletion. Do not normalize these.

## Component Tree (High Level)
app/page.tsx (root state)
  ├── LandingSequence
  ├── IdleOverlay (5-min power save)
  ├── DndContext
  │    ├── CategorySidebar
  │    ├── WeeklyPlan
  │    ├── TaskList → TaskRow
  │    └── TodayPanel → useTaskTimers, PersonalDevTracker
  ├── Stats
  └── [all dialogs/sheets]

## Custom Hooks
- useTaskTimers — per-task timer, localStorage-backed, sendBeacon on unload
- useIdleDetector — 5-min inactivity, respects Page Visibility API

## API Routes
All under app/api/. Covers: Tasks, Categories, CompletedTasks, TimeRecords, WeeklyPlan, UserInfo, Seed, Bulk.
All routes use lib/db.ts — never add direct DB calls in route files.

## Data Models (6 total)
- Category → has many Tasks
- Task → belongs to Category
- CompletedTask — denormalized snapshot, soft-delete via deletedAt
- TimeRecord — denormalized, survives task/category deletion
- WeeklyPlanEntry — unique constraint on (taskId + date), cascades on task delete
- UserInfo — singleton record, id="default"

## Current Goals
1. Evaluate deployment options — considering Vercel + Supabase or Railway. Need to pick a storage mode for production.
2. Data security audit — no sensitive personal data, but need correct env var handling and protected API routes.
3. Component breakdown — evaluate whether any TSX components need splitting for maintainability or performance.
4. Database decision — currently dual-mode (JSON vs Postgres). Need to commit to one for deployment.

## Coding Preferences
- TypeScript strict mode — no `any` unless necessary, always explain why
- Keep storage abstraction intact — changes to data models must update both json-db.ts and prisma.ts + schema
- Tailwind only — no inline styles, no CSS modules outside globals.css
- shadcn/ui components preferred over building from scratch
- New API routes follow existing pattern: route.ts for collection, [id]/route.ts for item
- When modifying data models, update lib/types.ts, both DB implementations, and Prisma schema together

## What NOT to Do
- Do not add React Context for data — state stays in page.tsx props drilling
- Do not add a global state library (Zustand, Redux, etc.) without discussion
- Do not write to data/ files directly from anywhere except lib/json-db.ts
- Do not add auth — this is intentionally single-user local
- Do not touch .env or suggest committing secrets

## Running the Project
./start.sh         — JSON mode (no Docker)
./db_start.sh      — Postgres mode (Docker required)
pnpm dev           — Manual (needs STORAGE_MODE set)