# read-codebase

Give the user a thorough orientation to the academic-dashboard codebase.

## Steps

1. Read `CLAUDE.md` for the canonical architecture overview.
2. Read `app/page.tsx` — it is the root state container; summarise all top-level state variables and which child components they feed.
3. Read `lib/db.ts`, `lib/json-db.ts`, and `lib/prisma.ts` — explain the dual-storage abstraction and where STORAGE_MODE is read.
4. Read `lib/types.ts` — list all 6 data models with their key fields.
5. Scan `app/api/` routes and list every endpoint (method + path + purpose).
6. Read `app/components/` or equivalent component files and describe the component tree matching CLAUDE.md's diagram.
7. Identify the two custom hooks (`useTaskTimers`, `useIdleDetector`) and explain their responsibilities.

## Output format

Return a structured report with these sections:
- **Stack summary** (one line each)
- **Root state** — variables in page.tsx and their purpose
- **Storage layer** — how db.ts, json-db.ts, prisma.ts relate
- **Data models** — name, key fields, relationships
- **API surface** — table of METHOD | path | description
- **Component tree** — indented list matching the codebase
- **Custom hooks** — name + one-paragraph description each
- **Open questions / gotchas** — anything that looks non-obvious or risky

Be concise. Prefer bullet points and tables over prose.
