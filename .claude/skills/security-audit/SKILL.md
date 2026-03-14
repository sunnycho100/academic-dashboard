# security-audit

Perform a targeted security audit of the academic-dashboard API surface and configuration.

## Scope

This is a single-user, no-auth app running locally. The threat model is:
- Unintentional exposure if deployed publicly without protection
- Secret leakage via committed env files or client-side exposure
- Input injection through the API routes

## Steps

1. Read `CLAUDE.md` to understand the architecture and what NOT to change.
2. Scan all files in `app/api/` — check each route for:
   - Missing input validation (no Zod or type checks on req body)
   - Direct object references without sanitisation
   - SQL injection risk (unlikely with Prisma, but check raw queries)
   - Missing error handling that leaks stack traces
3. Grep for `process.env` across all files — flag any env vars exposed to the client (must not appear in `app/` files outside `app/api/`).
4. Check `next.config.*` for `NEXT_PUBLIC_` env vars that might expose secrets.
5. Check `.gitignore` for `.env*` entries.
6. Grep for `dangerouslySetInnerHTML`, `eval(`, `Function(` — XSS vectors.
7. Check `lib/json-db.ts` for path traversal risk (user-controlled filenames).
8. Review `app/api/seed/route.ts` if it exists — seed endpoints must not be callable in production without a guard.

## Output format

Return findings as a prioritised list:

**CRITICAL** — exploitable now, fix before any deployment
**HIGH** — exploitable in specific conditions (e.g. if deployed)
**MEDIUM** — defence-in-depth improvements
**LOW / INFO** — observations, no immediate action needed

For each finding:
- Location (file:line)
- What the issue is
- Recommended fix (code snippet if short)

End with a **Deployment checklist** — minimum steps required before going live on Vercel/Railway.
