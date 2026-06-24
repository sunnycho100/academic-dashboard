# Auth Plan — Supabase Auth + Multi-Tenancy

## Overview

Add Supabase Auth (email + password) to convert the academic dashboard from a single-user local app to a multi-user app with per-user data isolation. Drop JSON storage mode, commit to PostgreSQL via Supabase. Deploy target: Vercel + Supabase.

## Subagent Execution Strategy

Instead of running one long agent session for the entire migration, the work is split into **independent subagent batches**. Each batch can be invoked as a separate subagent call. Batches marked ⚡ can run in parallel.

### Batch 1 — Foundation (must run first)

> **Single agent** — sets up the prerequisites everything else depends on.

- Phase 1.1: Install `@supabase/supabase-js` + `@supabase/ssr` via pnpm
- Phase 1.2: Create `.env.local` and `.env.example`
- Phase 1.3: Create `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- Phase 3.1–3.3: Update `prisma/schema.prisma` (add `userId` to all models), run migration, update `lib/types.ts`

**Why together**: The Supabase clients and the schema migration are both prerequisites for all later work. Combining them avoids a tiny agent that does almost nothing.

### Batch 2 — Auth layer + JSON removal ⚡ (2 parallel subagents)

> After Batch 1 completes, these two agents can run **in parallel** — they touch completely different files.

**Subagent 2A: Auth plumbing**
- Phase 2.2: Create `app/auth/callback/route.ts`
- Phase 2.3: Create `middleware.ts` (route protection)
- Phase 5.1: Create `lib/auth.ts` (shared `getAuthenticatedUser()` helper)

**Subagent 2B: Remove JSON storage mode**
- Phase 4: Delete `lib/json-db.ts`, simplify `lib/db.ts`, update `start.sh`, remove `loadState()` seed logic from `app/page.tsx`, delete `lib/store.ts`

**Why parallel**: 2A creates new files (`middleware.ts`, `lib/auth.ts`, `app/auth/`). 2B modifies/deletes storage files (`lib/db.ts`, `lib/json-db.ts`, `lib/store.ts`, `start.sh`). No file overlap.

### Batch 3 — API route updates (up to 3 parallel subagents) ⚡

> Depends on Batch 2A (`lib/auth.ts` must exist). Can split the 15 route files across subagents.

**Subagent 3A: Category + Task routes** (5 files)
- `api/categories/route.ts`
- `api/categories/[id]/route.ts`
- `api/tasks/route.ts`
- `api/tasks/[id]/route.ts`
- `api/tasks/reorder/route.ts`

**Subagent 3B: History + Time routes** (5 files)
- `api/completed-tasks/route.ts`
- `api/completed-tasks/[id]/route.ts`
- `api/completed-tasks/cleanup/route.ts`
- `api/time-records/route.ts`
- `api/time-records/[id]/route.ts`

**Subagent 3C: Plan + Utility routes** (5 files)
- `api/weekly-plan/route.ts`
- `api/timetable/route.ts`
- `api/user-info/route.ts`
- `api/bulk/route.ts`
- `api/seed/route.ts`

**Why parallel**: Each subagent edits a different set of route files. They all follow the same pattern (import `getAuthenticatedUser`, add `userId` scoping) so the prompt is nearly identical — just different file lists.

### Batch 4 — Frontend integration (single agent)

> Depends on Batches 2 + 3 (API routes must be auth-scoped, middleware must exist).

- Phase 2.1: Create `app/login/page.tsx` (login/signup form)
- Phase 2.4: Add user avatar + sign-out button to header in `app/page.tsx`
- Phase 6.1: Remove localStorage init flow from `app/page.tsx`
- Phase 6.2: Update `components/landing-sequence.tsx` to accept user name prop
- Phase 6.3: Namespace localStorage keys by userId in `hooks/use-task-timer.ts` and `app/page.tsx`

**Why single**: Multiple edits touch `app/page.tsx` — running parallel agents on the same file causes merge conflicts. One agent handles all frontend changes sequentially.

### Batch 5 — Cleanup & verify (single agent)

> Runs last. Validates the full integration.

- Phase 7: Remove `STORAGE_MODE` references, update `CLAUDE.md`, create `.env.example`
- Run `pnpm build` to verify no TypeScript errors
- Run through verification checklist

### Execution diagram

```
Batch 1 (foundation)
    │
    ├──── Batch 2A (auth plumbing) ──⚡──── Batch 2B (remove JSON mode)
    │            │
    │            v
    │     Batch 3A (category+task routes) ─⚡─ Batch 3B (history+time routes) ─⚡─ Batch 3C (plan+utility routes)
    │                          │
    │                          v
    │                   Batch 4 (frontend: login page, header, localStorage)
    │                          │
    │                          v
    └──────────────────── Batch 5 (cleanup + verify build)
```

### Summary

| Batch | Subagents | Parallel? | Depends on | Estimated files touched |
|-------|-----------|-----------|------------|------------------------|
| 1 | 1 | — | Nothing | 5 new + 2 modified |
| 2 | 2 | ⚡ Yes | Batch 1 | 3 new + 4 modified |
| 3 | 3 | ⚡ Yes | Batch 2A | 15 modified |
| 4 | 1 | — | Batches 2+3 | 1 new + 4 modified |
| 5 | 1 | — | Batch 4 | 3–4 modified |
| **Total** | **8 subagent calls** | | | **~9 new, ~28 modified, ~2 deleted** |

By splitting into 8 subagent calls (with parallelism in Batches 2 and 3), the total wall-clock time is roughly **5 sequential steps** instead of one monolithic run.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | Supabase Auth | Pairs naturally with Supabase Postgres; built-in email confirmation, rate limiting, JWT handling |
| Login method | Email + Password | Simple to start; OAuth (Google/GitHub) can be added later trivially |
| Data isolation | Application-layer `userId` scoping | We query through Prisma, not Supabase client — so RLS doesn't apply; add `userId` to all models and filter in API routes |
| Storage mode | PostgreSQL only | Drop JSON mode entirely; auth requires a real database |
| Deployment | Vercel + Supabase | Frontend on Vercel, database + auth on Supabase |
| Email confirmation | Enabled | Disabled during dev for convenience, enabled in production |
| Existing dev data | Wipe on migration | Adding `userId` is a fundamental schema change; fresh start is cleanest |
| OAuth | Deferred | Will add Google/GitHub OAuth in a future iteration |

---

## Phase 1 — Supabase Project & Package Setup

### 1.1 Install packages

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### 1.2 Environment variables

Add to `.env.local` (never committed):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...  # Supabase connection string (for Prisma)
```

Add to `.env.example` (committed, no secrets):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
```

### 1.3 Create Supabase client utilities

**`lib/supabase/client.ts`** — Browser client

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** — Server client for API routes

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**`lib/supabase/middleware.ts`** — Middleware session refresh helper

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  // Redirect unauthenticated users to /login (except /login and /auth paths)
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  // Redirect authenticated users away from /login
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
```

---

## Phase 2 — Auth UI & Routing

### 2.1 Login page — `app/login/page.tsx`

- Full-page login/signup form using shadcn/ui components
- Toggle between "Sign In" and "Sign Up" modes
- Fields: email, password (+ confirm password for signup)
- On submit: call `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`
- On signup success: show "Check your email for confirmation link" message
- Styled to match the dashboard theme (glass effects, dark/light mode)

### 2.2 Email confirmation callback — `app/auth/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/`)
}
```

### 2.3 Next.js middleware — `middleware.ts`

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### 2.4 User avatar + sign-out button in header

Location: `app/page.tsx`, line ~632, inside the `gap-2` div, before `<ThemeToggle />`

- Show a circular avatar with the user's email initial (e.g., "S" for sunghwan@...)
- DropdownMenu on click:
  - Display email address (disabled/label)
  - "Sign Out" button → calls `supabase.auth.signOut()` → redirects to `/login`

---

## Phase 3 — Database Schema Migration

### 3.1 Add `userId` to all models in `prisma/schema.prisma`

Every model gets:

```prisma
userId String
```

With composite indexes for common queries:

```prisma
model Category {
  id        String   @id @default(uuid())
  userId    String
  name      String
  color     String
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tasks     Task[]

  @@index([userId])
}
```

Apply to: `Category`, `Task`, `CompletedTask`, `TimeRecord`, `WeeklyPlanEntry`, `UserInfo`, `TimetableEntry`

Update `UserInfo` unique constraint from `id="default"` to `@@unique([userId])`.

### 3.2 Run migration

```bash
# Wipe existing dev data and create fresh migration
pnpm prisma migrate reset --force
pnpm prisma migrate dev --name add-user-id-multitenancy
```

### 3.3 Update `lib/types.ts`

Add `userId: string` to all type interfaces.

---

## Phase 4 — Remove JSON Storage Mode

### Files to delete

- `lib/json-db.ts` — JSON storage implementation
- `lib/store.ts` — localStorage helpers (if only used for JSON mode)

### Files to modify

- **`lib/db.ts`** — Remove factory pattern, directly export Prisma client:
  ```typescript
  import { PrismaClient } from './generated/prisma'
  export const prisma = new PrismaClient()
  ```
- **`start.sh`** — Remove `STORAGE_MODE=json` export
- **`app/page.tsx`** — Remove `loadState()` → `/api/seed` localStorage migration flow

### Files to remove from active use

- `data/*.json` — No longer read/written by the app (can keep for reference)

---

## Phase 5 — API Route Updates (13 route files)

### 5.1 Create shared auth helper — `lib/auth.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  return user.id
}
```

### 5.2 Update pattern for each route

**Collection routes** (GET + POST):

```typescript
// Before
const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } })

// After
const userId = await getAuthenticatedUser()
const categories = await prisma.category.findMany({
  where: { userId },
  orderBy: { order: 'asc' },
})
```

```typescript
// Before (create)
const category = await prisma.category.create({ data: { name, color } })

// After (create)
const userId = await getAuthenticatedUser()
const category = await prisma.category.create({ data: { name, color, userId } })
```

**Item routes** (PATCH/DELETE — verify ownership):

```typescript
const userId = await getAuthenticatedUser()
const category = await prisma.category.findUnique({ where: { id } })
if (!category || category.userId !== userId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
// proceed with update/delete
```

### 5.3 Full list of routes to update

| Route file | Methods | Changes |
|-----------|---------|---------|
| `api/categories/route.ts` | GET, POST | Filter by userId, add userId on create |
| `api/categories/[id]/route.ts` | PATCH, DELETE | Verify ownership |
| `api/tasks/route.ts` | GET, POST, DELETE | Filter by userId (via category), add userId on create |
| `api/tasks/[id]/route.ts` | PATCH, DELETE | Verify ownership |
| `api/tasks/reorder/route.ts` | POST | Verify all task IDs belong to userId |
| `api/completed-tasks/route.ts` | GET, POST | Filter by userId, add userId on create |
| `api/completed-tasks/[id]/route.ts` | PATCH | Verify ownership |
| `api/completed-tasks/cleanup/route.ts` | DELETE | Scope cleanup to userId |
| `api/time-records/route.ts` | GET, POST | Filter by userId, add userId on create |
| `api/time-records/[id]/route.ts` | PATCH, DELETE | Verify ownership |
| `api/weekly-plan/route.ts` | GET, POST, DELETE | Filter by userId, add userId on create |
| `api/timetable/route.ts` | GET, POST, PUT | Filter by userId, add userId on create |
| `api/user-info/route.ts` | GET, PUT | Use userId instead of id="default" |
| `api/bulk/route.ts` | POST | Scope imported data to userId |
| `api/seed/route.ts` | POST | Scope seed data to userId |

---

## Phase 6 — Frontend Auth Integration

### 6.1 `app/page.tsx`

- Remove localStorage-based initialization/seed flow (`loadState()`, `/api/seed` logic)
- Data loads purely from API (which is now scoped to authenticated user)
- Pass user info from Supabase session to `LandingSequence`

### 6.2 `components/landing-sequence.tsx`

- Accept user display name as prop from Supabase session
- Fallback: use email prefix if no display name set

### 6.3 Namespace localStorage keys by userId

Prevents cross-user timer/state leakage when switching accounts on the same browser:

| Current key | New key |
|-------------|---------|
| `class-catchup-timers` | `class-catchup-timers-{userId}` |
| `class-catchup-today` | `class-catchup-today-{userId}` |

Files to update:
- `hooks/use-task-timer.ts`
- `app/page.tsx` (today panel task IDs)

---

## Phase 7 — Cleanup & Verification

### Files to update

- Remove `STORAGE_MODE` references from: `lib/db.ts`, `start.sh`, `db_start.sh`, `CLAUDE.md`
- Update `CLAUDE.md` to reflect auth architecture
- Create `.env.example` with required env vars (no secrets)

### Verification checklist

- [ ] **Auth flow**: Sign up → confirm email → login → empty dashboard → create task → sign out → sign back in → task persists
- [ ] **Data isolation**: Two accounts each see only their own data
- [ ] **Route protection**: `/` while logged out → redirects to `/login`
- [ ] **API protection**: `GET /api/tasks` without session → 401
- [ ] **Ownership enforcement**: PATCH another user's task → 403/404
- [ ] **Timer isolation**: User A's localStorage timers don't leak to User B
- [ ] **Build check**: `pnpm build` passes with no TypeScript errors
- [ ] **Migration check**: `pnpm prisma migrate dev` runs cleanly

---

## Future Enhancements (Not in scope)

- [ ] Google OAuth login
- [ ] GitHub OAuth login
- [ ] Password reset flow
- [ ] User profile settings page (change display name, avatar)
- [ ] Supabase RLS as defense-in-depth (in addition to app-layer userId scoping)
- [ ] Rate limiting on custom API routes
- [ ] Account deletion / data export (GDPR)
