# CLAUDE.md — Academic Dashboard

## What This Project Is
A multi-user academic task management dashboard with Supabase Auth.
Deployed to Vercel + Supabase PostgreSQL. Version 2.3.1.

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.7 + React 19
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **Drag & Drop**: @dnd-kit
- **Animations**: Framer Motion 12
- **Forms**: hand-rolled controlled inputs (useState) + Zod (server-side validation in API routes)
- **Auth**: Supabase Auth (email + password)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Package Manager**: pnpm (always use pnpm, never npm/yarn)

## Authentication
- **Provider**: Supabase Auth (email + password sign-up/sign-in)
- **Proxy** (`proxy.ts`, Next 16's middleware convention → `lib/supabase/middleware.ts`): Uses `@supabase/ssr` to refresh session tokens on every request. Unauthenticated users are **allowed in guest mode** (no redirect); only authenticated users hitting `/login` are redirected to `/`.
- **API route auth**: Every API route calls `getAuthenticatedUser()` from `lib/auth.ts`, which returns the Supabase `user.id` or throws a 401 response.
- **Data scoping**: All database queries include `where: { userId }` so users only see their own data. All models have a `userId` column.
- **Login page**: `app/login/page.tsx` — email + password form, sign-up and sign-in modes.
- **Supabase clients**: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server/API routes), `lib/supabase/middleware.ts` (middleware).
- **localStorage namespacing**: Timer and today-panel keys are namespaced by userId (e.g., `class-catchup-timers-{userId}`).

## Storage Architecture
PostgreSQL via Supabase, accessed through Prisma ORM.

lib/db.ts → exports { prisma } from lib/prisma.ts → PostgreSQL (Supabase)

**Never bypass lib/db.ts.** All reads/writes go through it. Do not call PrismaClient directly from API routes.

## Key Architectural Rules
- All state lives in app/page.tsx (root client component). No external state library, no React Context for data.
- No server components used for data fetching — everything loads client-side via useEffect + fetch()
- Timer state lives in localStorage (namespaced by userId). Completed segments flush to /api/time-records via sendBeacon on unload.
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
- useTaskTimers — per-task timer, localStorage-backed (namespaced by userId), sendBeacon on unload
- useIdleDetector — 5-min inactivity, respects Page Visibility API

## API Routes
All under app/api/. Covers: Tasks, Categories, CompletedTasks, TimeRecords, WeeklyPlan, UserInfo, Timetable, Seed, Bulk.
All routes use lib/db.ts and call getAuthenticatedUser() for auth scoping.

## Data Models (7 total)
- Category → has many Tasks, scoped by userId
- Task → belongs to Category, scoped by userId
- CompletedTask — denormalized snapshot, soft-delete via deletedAt, scoped by userId
- TimeRecord — denormalized, survives task/category deletion, scoped by userId
- WeeklyPlanEntry — unique constraint on (taskId + date), cascades on task delete, scoped by userId
- UserInfo — one per user (userId is unique), scoped by userId
- TimetableEntry — daily schedule entries, scoped by userId

## Coding Preferences
- TypeScript strict mode — no `any` unless necessary, always explain why
- All data access goes through lib/db.ts (exports Prisma client)
- Tailwind only — no inline styles, no CSS modules outside globals.css
- shadcn/ui components preferred over building from scratch
- New API routes follow existing pattern: route.ts for collection, [id]/route.ts for item
- Every API route must call getAuthenticatedUser() and scope queries by userId
- When modifying data models, update lib/types.ts and Prisma schema together

## What NOT to Do
- Do not add React Context for data — state stays in page.tsx props drilling
- Do not add a global state library (Zustand, Redux, etc.) without discussion
- Do not bypass getAuthenticatedUser() in API routes — all data must be user-scoped
- Do not touch .env or suggest committing secrets

## Running the Project
```bash
pnpm dev              # Development server (requires .env with Supabase + DATABASE_URL)
./db_start.sh         # Start Docker PostgreSQL + dev server (local development)
./start.sh            # Production build + start
pnpm build            # Build only (runs prisma generate first)
```

## Environment Variables
Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `DATABASE_URL` — PostgreSQL connection string (Supabase session pooler)

## Testing (Playwright E2E)
- Specs live in `e2e/`. Run with `pnpm test:e2e` (auto-starts the dev server).
- The config forces the dev server onto a **local test Postgres** (Docker, `docker-compose.yml`) via `webServer.env.DATABASE_URL` — tests never touch production.
- `guest` project: unauthenticated smoke specs (no DB writes). `authed` project: authenticated flow specs gated on `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` in `.env.test` (gitignored); `global-setup` resets the test DB and saves a signed-in `storageState`.
- The E2E suite is the regression gate for the modernization work — keep it green.