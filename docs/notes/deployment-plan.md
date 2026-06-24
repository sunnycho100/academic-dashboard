# Deployment Plan: Academic Dashboard → Vercel + Supabase

## TL;DR
Deploy the Academic Dashboard to Vercel with Supabase PostgreSQL. Before deploying, run parallel subagents to fix all security vulnerabilities (5 routes missing Zod validation, 1 missing production guard, security headers) and refactor 6 oversized components. Then set up Supabase, configure Prisma for serverless, and deploy via Vercel CLI.

---

## Prerequisites (User has)
- Supabase account (no project yet)
- Vercel account (no CLI yet)
- Project on GitHub (sunnycho100/academic-dashboard, main branch)

## Decision: Storage Mode
**Use `STORAGE_MODE=postgres` with Supabase.** JSON mode uses filesystem writes (`data/*.json`) which won't persist on Vercel's ephemeral serverless environment. The Prisma schema is fully Supabase-compatible (UUID PKs, standard relations, cascade deletes).

---

## Phase 1: Code Hardening (4 Parallel Subagents)

All four agents run simultaneously — no dependencies between them.

### Agent A: Security Hardening
**Scope:** Fix all API route vulnerabilities found in audit.

**P0 fixes:**
1. `app/api/categories/[id]/route.ts` — Add Zod schema for PATCH body (name, color, order). Follow pattern from `app/api/categories/route.ts` POST.
2. `app/api/tasks/[id]/route.ts` — Add Zod schema for PATCH body (title, type, dueAt, categoryId, estimatedDuration, notes, priorityOrder). Follow pattern from `app/api/tasks/route.ts` POST.
3. `app/api/completed-tasks/route.ts` — Add Zod schema for POST body (taskTitle, categoryName, categoryColor, taskType, estimatedDuration, actualTimeSpent).
4. `app/api/completed-tasks/[id]/route.ts` — Add Zod schema for PATCH body (deleted: boolean).
5. `app/api/completed-tasks/cleanup/route.ts` — Add production guard: `if (process.env.NODE_ENV === 'production') return 403`.

**P1 fixes:**
6. `app/api/timetable/route.ts` — Add Zod schema for PUT bulk entries.
7. `app/api/time-records/route.ts` — Validate query params (tz, startHour) with regex before parseInt.
8. `app/api/weekly-plan/route.ts` — Add Zod validation for taskId (uuid format) and date (ISO string).

**P2 fixes:**
9. `next.config.mjs` — Add security headers middleware (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy).

### Agent B: Refactor time-records-dialog.tsx (~1,500 lines → ~4 files)
**Scope:** Split the largest component.

Extract from `components/time-records-dialog.tsx`:
1. `components/time-records/time-block.tsx` — TimeBlock visualization component
2. `components/time-records/metric-card.tsx` — MetricCard analytics display
3. `components/time-records/current-time-line.tsx` — CurrentTimeLine overlay
4. `components/time-records/time-record-form.tsx` — Edit/Add form (shared)

Keep `time-records-dialog.tsx` as the orchestrator importing these pieces.

### Agent C: Refactor today-panel.tsx (~1,100 lines) + app/page.tsx (~1,200 lines)
**Scope:** Two related critical files.

**today-panel.tsx → extract:**
1. `components/today/focus-mode-overlay.tsx` — Full-screen focus mode
2. `components/today/sortable-today-item.tsx` — Individual task item in today list
3. `components/today/rolling-counter.tsx` — Animated number counter

**app/page.tsx → extract:**
1. `hooks/use-tasks.ts` — Task CRUD mutation functions (createTask, updateTask, deleteTask, etc.)
2. `hooks/use-categories.ts` — Category CRUD mutation functions
3. `components/catchup-content.tsx` — Class Catch-up tab content (DndContext + CategorySidebar + WeeklyPlan + TaskList + TodayPanel + Stats)
4. `components/timetable-content.tsx` — Timetable tab content wrapper

### Agent D: Refactor remaining oversized components
**Scope:** 3 more files.

**task-row.tsx (~600 lines) → extract:**
1. `components/task/inline-edit.tsx` — Inline title editor
2. `components/task/inline-duration-edit.tsx` — Inline duration editor
3. `components/task/task-metadata.tsx` — Badge/metadata display section

**timetable.tsx (~750 lines) → extract:**
1. `components/timetable/timetable-row.tsx` — Individual row component
2. `hooks/use-timetable-logic.ts` — Auto-fill + autopush logic

**Consolidate add-task-sheet.tsx + edit-task-sheet.tsx:**
1. `components/task-form-sheet.tsx` — Shared form with `mode: "add" | "edit"` prop
2. Remove `add-task-sheet.tsx` and `edit-task-sheet.tsx`, update imports in `app/page.tsx`

---

## Phase 2: Supabase Setup (Manual — User Action)

*Depends on: Nothing (can start during Phase 1)*

1. **Create Supabase project**
   - Go to supabase.com → Dashboard → New Project
   - Region: choose closest to you
   - Database password: generate strong password, save securely
   - Wait for project provisioning (~2 min)

2. **Get connection strings**
   - Go to Project Settings → Database → Connection string
   - Copy **Session mode** connection string (port 5432 with `?pgbouncer=true`)
     Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - Also copy **Direct connection** string (for migrations)
     Format: `postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres`

3. **Note the two URLs** — needed in Phase 3:
   - `DATABASE_URL` = Session mode pooler URL (for runtime)
   - `DIRECT_URL` = Direct connection URL (for Prisma migrations)

---

## Phase 3: Deployment Configuration (Sequential — after Phase 1 & 2)

### Step 1: Update Prisma schema for Supabase
**File:** `prisma/schema.prisma`
- Add `directUrl` to datasource for migration support:
  ```
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```

### Step 2: Update Prisma client config for serverless
**File:** `lib/prisma.ts`
- Configure `pg.Pool` with serverless-appropriate settings:
  - `max: 5` (Vercel serverless functions share pool)
  - `idleTimeoutMillis: 30000`
  - `connectionTimeoutMillis: 10000`

### Step 3: Update lib/db.ts — remove silent fallback
**File:** `lib/db.ts`
- Remove the try/catch that silently falls back to JSON mode when Prisma fails
- In production, if STORAGE_MODE=postgres and DB fails, it should throw, not silently degrade

### Step 4: Create .env.production.local template
```env
STORAGE_MODE=postgres
DATABASE_URL="postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[pw]@db.[ref].supabase.co:5432/postgres"
```

### Step 5: Run Prisma migrations against Supabase
```bash
# Set DIRECT_URL locally for migration
export DIRECT_URL="<direct-connection-string>"
export DATABASE_URL="<session-pooler-string>"
pnpm prisma migrate deploy
```

### Step 6: Verify build locally
```bash
STORAGE_MODE=postgres pnpm build
```
Ensure zero TypeScript errors and successful build output.

---

## Phase 4: Vercel Deployment (Sequential)

### Step 1: Install Vercel CLI
```bash
pnpm add -g vercel
vercel login
```

### Step 2: Link project
```bash
vercel link
# Select: sunnycho100's projects
# Link to existing? No → Create new
# Project name: academic-dashboard
# Framework: Next.js (auto-detected)
# Root directory: ./
```

### Step 3: Set environment variables in Vercel
```bash
vercel env add STORAGE_MODE production  # value: postgres
vercel env add DATABASE_URL production  # value: session pooler URL
vercel env add DIRECT_URL production    # value: direct connection URL
```

### Step 4: Deploy preview
```bash
vercel deploy --no-wait
```

### Step 5: Verify preview deployment
- Open preview URL
- Test: create category, create task, complete task, view time records
- Check Supabase dashboard → Table Editor → verify data persisted
- Test timer functionality (start/stop/flush)

### Step 6: Deploy production (after verification)
```bash
vercel deploy --prod --no-wait
```

### Step 7: Set up Git integration
- Vercel dashboard → Project → Settings → Git
- Connect GitHub repo `sunnycho100/academic-dashboard`
- Branch: `main` → auto-deploy on push

---

## Verification Checklist

### After Phase 1 (Code Hardening)
- [ ] `pnpm build` succeeds with zero errors
- [ ] All Zod schemas reject malformed input (test with curl or API client)
- [ ] Production-guarded routes return 403 when `NODE_ENV=production`
- [ ] Security headers present in response (check via browser devtools)
- [ ] Refactored components render identically (visual regression check)
- [ ] No broken imports after file moves

### After Phase 3 (Deployment Config)
- [ ] `STORAGE_MODE=postgres pnpm build` succeeds
- [ ] Prisma migrations applied to Supabase (check Supabase Table Editor)
- [ ] Can create/read/update/delete tasks via the app locally pointing at Supabase

### After Phase 4 (Live Deployment)
- [ ] Preview URL loads, shows landing sequence
- [ ] CRUD operations work (categories, tasks, completed tasks)
- [ ] Timers persist across page reloads (localStorage)
- [ ] Timer data flushes to time-records on page unload
- [ ] Weekly plan drag-and-drop works
- [ ] Timetable tab works with autofill/autopush
- [ ] Data persists in Supabase after browser close and reopen
- [ ] No console errors
- [ ] Security headers visible in Network tab

---

## Parallel Execution Strategy (Subagent Orchestration)

```
Phase 1: Run 4 agents in parallel
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Agent A:         │  │ Agent B:             │  │ Agent C:             │  │ Agent D:             │
│ Security fixes   │  │ time-records-dialog  │  │ today-panel +        │  │ task-row +           │
│ (9 route fixes + │  │ split into 4 files   │  │ page.tsx refactor    │  │ timetable +          │
│  security headers│  │                      │  │ into 7 files         │  │ task-form merge      │
│  in next.config) │  │                      │  │                      │  │ into 6 files         │
└────────┬─────────┘  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
         │                       │                         │                         │
         └───────────────────────┴─────────────┬───────────┴─────────────────────────┘
                                               │
                                        Build & Verify
                                               │
                              Phase 2: Supabase Setup (manual)
                                               │
                              Phase 3: Deployment Config (sequential)
                                               │
                              Phase 4: Vercel Deploy (sequential)
```

**Why parallel works here:** Each agent modifies different files. Agent A touches API routes only, Agent B touches time-records-dialog only, Agent C touches today-panel + page.tsx + creates new hooks, Agent D touches task-row + timetable + task sheets. No file conflicts.

**Potential conflict:** Agent C extracts mutations from `app/page.tsx` and Agent D consolidates task sheets imported by `app/page.tsx`. **Resolution:** Agent C handles all page.tsx structural changes; Agent D only changes its own component files and updates the imports in page.tsx for the task-form consolidation. Run a build verification step after all 4 complete to catch any import issues.

---

## Decisions & Scope

- **Storage mode:** Postgres only for production. JSON mode remains for local dev.
- **Auth:** Not adding auth. App remains single-user as designed.
- **Domain:** Free Vercel subdomain (e.g. academic-dashboard.vercel.app).
- **Rate limiting:** P2 — not blocking deployment. Can add via Vercel Edge Middleware later.
- **Monitoring:** Vercel provides basic analytics and function logs out of the box. No additional setup needed initially.

## Excluded from This Plan
- Custom domain setup
- Authentication / multi-user support
- CI/CD pipeline (GitHub Actions) — Vercel's Git integration handles this
- Database backups (Supabase handles this on paid plans)
- Performance optimization (Lighthouse, bundle analysis)

## Further Considerations
1. **Supabase plan:** Free tier gives 500MB DB, 2 projects. Sufficient for single-user app. Consider Pro ($25/mo) only if you need automatic backups or >500MB storage.
2. **Agent C/D conflict on page.tsx:** Safest approach is to let Agent C own all page.tsx structural changes, and Agent D only create new files + update task-form-related imports as a final pass.
3. **Cleanup route production guard:** `/api/completed-tasks/cleanup` only purges soft-deleted records >3 days old — it's housekeeping, not destructive data loss. It is guarded (added in Agent A's P0 fixes above) but the decision of whether to keep it open for cron jobs later is noted here.
