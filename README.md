# Academic Dashboard

A local macOS app for catching up on lectures, assignments, and exam prep. Tasks by course, a Today plan with deep-work timers, a weekly plan, a day-planner timetable, and time records. Everything is stored on your Mac, with no account or server.

## Run it

```bash
pnpm install
pnpm app        # builds and installs /Applications/Academic Dashboard.app
```

For development, `pnpm dev` opens the app with hot reload.

Your data lives in `~/Library/Application Support/Academic Dashboard/academic-dashboard.db` (SQLite). Dev runs use `academic-dashboard-dev.db` in the same folder, so iterating never touches real data. Settings > Export data saves a JSON backup, and Import restores one.

## How it works

```
src/
  main/        Electron main process
    index.ts   window + app:// protocol
    routes.ts  maps /api/* requests to the handlers in api/
    api/       one route.ts per endpoint (tasks, categories, time-records, ...)
    lib/       SQLite via Prisma, local user
  renderer/    React UI (components, hooks, styles)
prisma/        schema + migrations
e2e/           Playwright tests against the built app
docs/          design system, notes, changelog
```

The window loads `app://local/`. The UI calls `fetch('/api/...')` and the main process answers from the handlers in `src/main/api`, so there is no HTTP server or open port.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run with hot reload |
| `pnpm app` | Build, package, and install to /Applications |
| `pnpm dist` | Build and package to `release/` only |
| `pnpm db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Build, then run the Playwright suite against the app |

## Stack

Electron, React 19, TypeScript, Vite (electron-vite), Tailwind CSS with shadcn/ui, Prisma with SQLite (better-sqlite3), dnd-kit, Framer Motion. Package manager: pnpm.
