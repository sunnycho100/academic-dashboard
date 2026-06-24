# E2E Tests (Playwright)

Phase 0 safety net — characterization tests that lock in current behavior before
the modernization refactor. The suite must be **green on current code** before any
phase merges, and green again after each phase.

## Running

```bash
pnpm test:e2e          # headless
pnpm test:e2e:ui       # interactive UI mode
pnpm test:e2e:report   # open the last HTML report
```

The config (`playwright.config.ts`) auto-starts `pnpm dev` on :3000 and reuses an
already-running dev server locally.

## Test tiers

### 1. Guest-mode (`smoke.spec.ts`) — no setup needed
Runs against the real dev server with **no DB writes** (read-only, safe). Covers the
unauthenticated shell: default categories render, tabs switch, login page reachable.

### 2. Authenticated flows — require a test database + test user
The core flows (add/complete task, timer → time record, timetable autofill/autopush,
time-record cascade edit, weekly plan, export/import) all write data scoped to a user.
Running them against the **production Supabase would corrupt real data**, so they need
an isolated target.

**Required env (in `.env.test`, gitignored — never commit):**

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres for the **test** database (local Docker PG or a separate Supabase project) |
| `NEXT_PUBLIC_SUPABASE_URL` | Test Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Test Supabase anon key |
| `E2E_TEST_EMAIL` | Seeded test user email |
| `E2E_TEST_PASSWORD` | Seeded test user password |

Auth is established once via a global-setup project that signs in and saves
`storageState` to `e2e/.auth/user.json` (gitignored); authenticated specs reuse it.

The test DB is **local Docker Postgres** (`docker-compose.yml`). Bring it up before
running authenticated specs:

```bash
docker compose up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academic_dashboard pnpm prisma migrate deploy
```

`global-setup` truncates all data tables each run, so every authenticated spec starts
from a clean slate.

## Current coverage (Phase 0 safety net)

Guest (`smoke.spec.ts`): shell loads with default categories, tab switching, login reachable.

Authed (`authed/*.spec.ts`):
- **tasks** — seeded task renders; add task via form; complete task removes it from the list
- **views** — Overdue / Due Soon tabs filter by due date
- **today-panel** — add to today reveals the timer control
- **data-management** — export downloads dashboard JSON
- **timetable** — autofill populates an empty planned-start on focus

### Deferred (add as the refactor touches them)
Timer → time-record creation, time-record cascade-shift edit, timetable autopush cascade,
weekly-plan drag-and-drop, and JSON import. The timetable/time-record auto-logic helpers
(`hooks/use-timetable-logic.ts`) are pure functions and are better covered by fast unit
tests — a good fast-follow once the suite needs deeper auto-logic protection.
