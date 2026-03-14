# eval-db

Evaluate the current dual-storage setup and recommend a database strategy for production deployment.

## Context

This project has two storage backends controlled by `STORAGE_MODE`:
- `json` → `lib/json-db.ts` → `data/*.json` files
- `postgres` → `lib/prisma.ts` → PostgreSQL 16 via Docker

The current deployment target options are Vercel + Supabase or Railway.

## Steps

1. Read `lib/db.ts`, `lib/json-db.ts`, `lib/prisma.ts`, and `prisma/schema.prisma` (if it exists).
2. Read all `data/*.json` files to understand current data volume and shape.
3. Grep API routes in `app/api/` for any direct DB calls that bypass `lib/db.ts` (there shouldn't be any — flag if found).
4. Check `.env.example` or `.env.local` if present for current env var setup.
5. Review `CLAUDE.md` Current Goals section.

## Evaluation criteria

Score each option (JSON-only, Postgres-only, keep dual) on:
- **Deployment fit** — does it work on Vercel / Railway without changes?
- **Data safety** — risk of data loss, backup options
- **Operational complexity** — setup, migrations, maintenance
- **Performance** — for single-user local + potential cloud use
- **Cost** — free tier availability on Supabase / Railway / PlanetScale

## Output format

- **Current state summary** — what the dual-mode setup looks like today
- **Risk flags** — any bypasses, inconsistencies, or schema drift found
- **Recommendation** — single clear choice (JSON or Postgres) with 3-bullet rationale
- **Migration steps** — if the recommendation requires changes, list them in order
- **Env vars needed** — exact variable names for the recommended setup
