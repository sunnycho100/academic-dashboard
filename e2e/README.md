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

> Status: the test-DB strategy is pending a decision (Docker PG vs. dedicated Supabase
> project). Authenticated specs land once that target exists.
