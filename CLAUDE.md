# CLAUDE.md — Academic Dashboard

## What This Project Is
A single-user academic task dashboard, shipped as a local macOS Electron app.
No login, no server: data is a SQLite file on the user's Mac. Version 3.0.0.
(It used to be a Next.js + Supabase web app on Vercel; the Mac app replaced it.)

## Stack
- **Shell**: Electron, built with electron-vite, packaged with electron-builder
- **UI**: React 19 + TypeScript, Tailwind CSS 3.4 + shadcn/ui (Radix), dnd-kit, Framer Motion
- **Data**: Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`, Zod validation in handlers
- **Package Manager**: pnpm 11 only (never npm/yarn). Build-script approvals live in `pnpm-workspace.yaml`.

## Project Structure
```
src/
  main/                  Electron main process
    index.ts             window, app:// protocol, single-instance lock
    routes.ts            loads api/ handlers + db (dynamic import, after app ready)
    router.ts            Next-style file router for api/**/route.ts (router.test.ts)
    api/                 one route.ts per endpoint, [id] folders for items
    lib/db.ts            Prisma client, SQLite path, runs migrations on startup
    lib/auth.ts          local user id
  renderer/              React app (index.html, main.tsx, app.tsx, globals.css)
    components/          ui/ = shadcn; feature folders: layout tasks categories today
                         timetable time-records weekly-plan settings theme
    hooks/ lib/
prisma/                  schema.prisma + migrations/ (SQLite)
.config/prisma.ts        Prisma CLI config (dev db at prisma/dev.db)
e2e/                     Playwright against the built app (playwright.config.ts inside)
docs/                    design system, notes, specs, changelog
```
Aliases: `@/` = `src/renderer`, `@main/` = `src/main`.

## How Requests Flow
The window loads `app://local/`. Renderer code calls `fetch('/api/...')`; the `app://`
protocol handler in `src/main/index.ts` routes it to `src/main/api/**/route.ts`
(Web-standard `Request`/`Response` handlers). Non-API paths serve the built renderer.
In dev, non-API paths are proxied to the Vite dev server.

## Data
- App DB: `~/Library/Application Support/Academic Dashboard/academic-dashboard.db`.
  Dev runs (`pnpm dev`, unpackaged) use `academic-dashboard-dev.db` so they never touch real data.
- `ACADEMIC_DASHBOARD_USER_DATA` overrides the folder (the e2e suite uses a temp dir per test).
- Migrations: `lib/db.ts` applies `prisma/migrations/*/migration.sql` in order, tracked by
  `PRAGMA user_version`. Never edit an applied migration; run `pnpm db:migrate` to add one.
- All models keep a `userId` column (always `'local'`); handlers still scope by it.
- CompletedTask and TimeRecord are intentionally denormalized so history survives deletion. Do not normalize.

## Key Architectural Rules
- All UI state lives in `src/renderer/app.tsx` (root component), prop-drilled. No React Context for data, no state library without discussion.
- Data loads client-side via `useEffect` + `fetch('/api/...')`.
- Timer state lives in localStorage (namespaced by user id). Finished segments flush to `/api/time-records` with a `keepalive` fetch on unload.
- The renderer has no Node access (sandbox, contextIsolation, no preload). Anything needing Node goes in a main-process handler.

## Coding Preferences
- TypeScript strict; no `any` without a comment explaining why.
- Tailwind only, no inline styles, no CSS modules outside globals.css. shadcn/ui before custom components.
- New endpoints: `route.ts` for the collection, `[id]/route.ts` for an item, exporting `GET`/`POST`/... functions.
- When changing data models, update `prisma/schema.prisma` (+ migration) and `src/renderer/lib/types.ts` together.

## Running
```bash
pnpm dev          # hot reload
pnpm app          # build + package + install to /Applications
pnpm typecheck    # tsc
pnpm test         # unit tests (node --test)
pnpm test:e2e     # build, then Playwright against the Electron app
```

## Testing
- `e2e/support/app.ts` launches the built app per test with a fresh temp database and exposes
  `page`, `electronApp`, and an `api` fixture (seed via the app's own /api).
- The e2e suite is the regression gate. Keep it green.
