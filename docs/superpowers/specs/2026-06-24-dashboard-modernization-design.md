# Academic Dashboard — Modernization Design

**Date:** 2026-06-24
**Branch base:** `feature/mcp` (current) → work on dedicated branches per phase
**Status:** Approved, pending execution via `/goal`

## Goal

Modernize the Academic Dashboard (v1.7.2, production on Vercel + Supabase) for code
efficiency and current Next.js 16 idioms, and reskin the UI to the Cohere-inspired
design system in `DESIGN.md` — **while preserving existing behavior exactly.**

This is a **pure refactor + polish**: same features, same flows, better code, faster
loads, new visual language. No new features, no removed features.

## Locked Decisions

| Decision | Choice |
|---|---|
| Focus areas | Code architecture & efficiency, data-layer & performance, UI/UX polish |
| MCP / agentic work | **Parked** — out of scope for this effort (but the data layer is built to serve it later) |
| Appetite | **Full modernization** — Server Components, Server Actions, real state boundaries |
| Migration strategy | **Horizontal** — layer by layer, app-wide, not feature-by-feature |
| Safety net | **Playwright E2E on critical flows first**, before any refactor |
| Functional scope | **Pure refactor + polish** — behavior preserved, `DESIGN.md` drives visuals |
| Client state | **Zustand** (recommended; swap for split React Contexts if preferred) |

## Target Architecture (end state)

```
app/page.tsx  →  Server Component
   ├─ fetches initial data server-side (categories, tasks, weekly entries, completed count)
   └─ renders <DashboardShell initialData={…} user={…} />   ← client island

lib/data/*    →  shared data-access layer (pure fns: getTasks, createTask, …) taking userId
   ├─ called by Server Actions   (web app mutations)
   ├─ called by app/api/* routes (kept as thin wrappers for now)
   └─ reusable by mcp/ later (parked agentic work benefits for free)

app/actions/* →  Server Actions replace client fetch() for all mutations
                 (optimistic update on client → action → revalidate)
```

**Principle: one data-access layer, three consumers.** No business logic duplicated
across API routes, Server Actions, and the future MCP server.

## State Decomposition (`app/page.tsx`, 870 lines → thin shell)

The 29 `useState`s in `page.tsx` sort into four buckets:

| Bucket | Examples | New home |
|---|---|---|
| Server data | categories, tasks, weeklyEntries, completedTodayCount | RSC props + Server Actions (no client fetch-on-mount) |
| UI view state | viewMode, sortOption, groupByCategory, searchQuery, selectedCategoryId, activeMainTab | Zustand UI store |
| Dialog flags | ~11 `*Open` booleans | `useDialogs` store/manager |
| Ephemeral/session | activeDragId + drag handlers, todayTaskIds (localStorage), mounted, landingComplete | `useDragOrchestration` hook; `useTodayPlan` hook |

Prop-drilling through `CatchupContent` (30+ props today) collapses to store reads.
`useTasks` / `useCategories` hooks already exist — extend that pattern.

## Phase Plan (horizontal, layer-by-layer)

Each phase is an independent branch + PR. **The E2E suite is the merge gate for every phase.**
At the end of each phase, update `CLAUDE.md` to reflect the new rules it establishes.

### Phase 0 — E2E Safety Net
Set up Playwright + a seeded test user against local Docker PG (`db_start.sh`).
Cover critical flows:
- Auth (sign-in) + guest mode
- Add category, add task
- Complete a task → completed-today counter increments
- Add to / remove from / reorder Today; carry-over yesterday
- Drag task → weekly-plan day; drag task → Today drop zone; reorder within list
- Timer start/stop in Today panel → time record created
- Timetable autofill start, autofill end AM/PM, autopush cascade
- Time-record edit with cascade shift of subsequent records
- Export / import / clear data
- Sort / filter (view modes) / search

**Verify:** suite green on current (un-refactored) code.

### Phase 1 — Hygiene
- Dependency audit: remove unused packages (many of 35+ `@radix-ui/*`, carousel, OTP input, resizable-panels, vaul — verify each before removing).
- Dead-code sweep (only code made dead, plus clearly-unused exports).
- Consolidate loose root `.md` files (`UI_improvement.md`, `theme.md`, `uiux-edit.md`, `auto-logic.md`, `auth-plan.md`, `deployment-plan.md`) into `docs/`.

**Verify:** suite green; `pnpm build` clean; bundle smaller (record before/after).

### Phase 2 — State & Components
- Introduce Zustand UI + dialog stores; extract `useDragOrchestration`, `useTodayPlan`.
- Reduce `page.tsx` to a thin shell.
- Split oversized files into logic-hook + dumb view:
  - `time-records-dialog.tsx` (943)
  - `today-panel.tsx` (692)
  - `activity-summary-dialog.tsx` (691)
  - `task-form-sheet.tsx` (549)

**Verify:** suite green; behavior identical; no component over ~400 lines without justification.

### Phase 3 — Data Layer
- Build `lib/data/*` shared access layer.
- Add `app/actions/*` Server Actions for all mutations; client uses optimistic update + rollback + `sonner` toast on failure.
- `app/page.tsx` becomes a Server Component performing initial reads; remove `useEffect+fetch`-on-mount waterfalls.
- Keep `app/api/*` as thin wrappers over `lib/data/*` (preserves any external/MCP callers).

**Verify:** suite green; no client fetch-on-mount; measurably faster first paint.

### Phase 4 — UI Reskin (Cohere / `DESIGN.md`)
- Adopt the Cohere design system from `DESIGN.md`: white canvas default, deep-green/navy
  feature bands, pill CTAs, tight display type + measured body type, flat surfaces with
  thin hairline borders, coral/blue used only as accents.
- **Reconcile with the existing glassmorphism theme** — decide at phase start whether to
  fully replace glass with the Cohere flat system or blend. Default recommendation:
  replace glass with the flat editorial system for coherence with `DESIGN.md`.
- Map `DESIGN.md` tokens (colors, typography, radius, spacing) into `tailwind.config.ts`
  and `globals.css` as the design-token source of truth.

**Verify:** suite green; visual review against `DESIGN.md`; dark/light modes intact;
`prefers-reduced-motion` respected.

## Error Handling & Rollback

- Server Actions return typed `{ ok: true, data } | { ok: false, error }`.
- Client does optimistic update, rolls back + toasts on failure.
- Each phase is its own branch/PR and independently revertible.
- The E2E suite gates every merge — a red suite blocks the phase.

## Constraints

- `pnpm` only (never npm/yarn).
- Do not touch `.env` or commit secrets.
- Do not work on `mcp/` (parked).
- Preserve user-scoped data access (`getAuthenticatedUser()` + `where: { userId }`).
- Keep `CompletedTask` / `TimeRecord` denormalized (history survives deletion).
- Update `CLAUDE.md` rules as phases change them (god-component, no-state-lib,
  client-only-fetch rules are being intentionally rewritten).

## Out of Scope

- New features; flow changes beyond what `DESIGN.md` visually implies.
- MCP server build-out.
- Database schema changes.
