# MCP Server Development Plan

## Overview

Build an MCP (Model Context Protocol) server that exposes the academic dashboard's existing API as tools Claude can call. The server acts as a thin translation layer — each tool maps to one or more existing API route calls.

Since all API routes already have Zod validation, Prisma types, and auth scoping via `getAuthenticatedUser()`, the MCP tools can either:
- **Option A**: Call the existing Next.js API routes over HTTP (simplest, works immediately)
- **Option B**: Import `lib/db.ts` and `lib/auth.ts` directly for a co-located server (tighter integration, no HTTP overhead)

---

## Tool Groups

### 1. Task Management

| Tool | Maps to | What it does |
|------|---------|--------------|
| `list_tasks` | `GET /api/tasks` | Returns all tasks, optionally filtered by category, status, or type |
| `create_task` | `POST /api/tasks` | Creates a task with title, type, due date, category, estimated duration, notes |
| `update_task` | `PATCH /api/tasks/[id]` | Updates any field on a task (status, title, due date, notes, etc.) |
| `delete_task` | `DELETE /api/tasks/[id]` | Removes a task |
| `reorder_tasks` | `POST /api/tasks/reorder` | Bulk-updates priority order after sorting |

**Why useful**: Core CRUD. Lets Claude create assignments, mark things done, reschedule due dates, or reorganize priorities through conversation.

### 2. Category Management

| Tool | Maps to | What it does |
|------|---------|--------------|
| `list_categories` | `GET /api/categories` | Returns all course categories with colors and order |
| `create_category` | `POST /api/categories` | Adds a new course/category |
| `update_category` | `PATCH /api/categories/[id]` | Renames or recolors a category (cascades to completed tasks + time records) |
| `delete_category` | `DELETE /api/categories/[id]` | Removes a category and its tasks |

**Why useful**: Manage courses. "Add a new class called MATH 301 with blue color."

### 3. Completed Tasks / History

| Tool | Maps to | What it does |
|------|---------|--------------|
| `list_completed_tasks` | `GET /api/completed-tasks` | Returns completion history (excludes soft-deleted) |
| `complete_task` | `POST /api/completed-tasks` | Records a task as completed with time data |
| `update_completed_task` | `PATCH /api/completed-tasks/[id]` | Edits a completed task record or soft-deletes it |

**Why useful**: "What did I finish this week?" or "How accurate were my time estimates for CS assignments?"

### 4. Time Tracking

| Tool | Maps to | What it does |
|------|---------|--------------|
| `get_time_records` | `GET /api/time-records` | Returns work sessions for a given date, with timezone support |
| `create_time_record` | `POST /api/time-records` | Logs a work session (task, start/end time, duration) |
| `update_time_record` | `PATCH /api/time-records/[id]` | Edits a time record |
| `delete_time_record` | `DELETE /api/time-records/[id]` | Removes a time record |

**Why useful**: "How much time did I spend studying today?" or "Log 45 minutes on the PHYS homework."

### 5. Weekly Plan

| Tool | Maps to | What it does |
|------|---------|--------------|
| `get_weekly_plan` | `GET /api/weekly-plan?weekStart=YYYY-MM-DD` | Returns the 7-day plan with full task/category data |
| `plan_task` | `POST /api/weekly-plan` | Assigns a task to a specific day |
| `unplan_task` | `DELETE /api/weekly-plan` | Removes a task from the weekly plan |

**Why useful**: "Plan my week — spread these 5 assignments across Mon-Fri" or "Move the essay to Thursday."

### 6. Timetable / Daily Schedule

| Tool | Maps to | What it does |
|------|---------|--------------|
| `get_timetable` | `GET /api/timetable?date=YYYY-MM-DD` | Returns scheduled activities for a day |
| `get_incomplete_entries` | `GET /api/timetable?incompleteBefore=YYYY-MM-DD` | Returns unfinished timetable entries from past days |
| `create_timetable_entry` | `POST /api/timetable` | Adds a single scheduled block (planned start/end, activity name) |
| `bulk_update_timetable` | `PUT /api/timetable` | Replaces all entries for a date (full day rewrite) |

**Why useful**: "Set up my Tuesday schedule: 9am lecture, 11am lab, 2pm study session." or "What didn't I finish yesterday?"

### 7. User Info

| Tool | Maps to | What it does |
|------|---------|--------------|
| `get_user_info` | `GET /api/user-info` | Returns user's display name |
| `update_user_info` | `PUT /api/user-info` | Updates display name |

**Why useful**: Personalization. Low priority but trivial to add.

---

## Compound / Smart Tools (Optional)

These don't map 1:1 to routes — they combine multiple calls for higher-level actions:

| Tool | What it does |
|------|--------------|
| `get_dashboard_summary` | Fetches tasks + categories + today's time records + weekly plan in one call. Gives Claude full context to answer "what should I work on?" |
| `complete_and_log` | Marks a task done + creates completed task record + logs time record in one action |
| `get_productivity_stats` | Aggregates time records and completed tasks to show study hours by category, estimated vs actual accuracy, completion streaks |
| `plan_study_session` | Given available hours and pending tasks, suggests an optimized schedule and creates timetable entries |

---

## Auth Strategy

The MCP server needs to authenticate as the user. Options:

1. **Pass Supabase session token** — MCP server receives the user's auth token and forwards it to API routes (works with Option A / HTTP approach)
2. **API key per user** — Generate a personal API key stored in UserInfo, MCP server validates it directly (simpler for personal use)
3. **Direct DB access with hardcoded userId** — For single-user / local development only (simplest, no auth overhead)

---

## Tech Stack Choices

| Choice | Recommendation |
|--------|---------------|
| SDK | `@modelcontextprotocol/sdk` (TypeScript, matches the existing codebase) |
| Transport | Streamable HTTP (for remote deployment) or stdio (for local Claude Desktop) |
| Hosting | Same Vercel project as a separate serverless function, or standalone on Cloudflare Workers |
| Validation | Reuse existing Zod schemas from API routes |

---

## File Structure (Proposed)

```
mcp/
  server.ts          — MCP server setup + tool registration
  tools/
    tasks.ts         — Task CRUD tools
    categories.ts    — Category CRUD tools
    completed.ts     — Completed tasks tools
    time-records.ts  — Time tracking tools
    weekly-plan.ts   — Weekly plan tools
    timetable.ts     — Timetable/schedule tools
    user-info.ts     — User info tools
    compound.ts      — Smart/compound tools (dashboard summary, etc.)
  lib/
    api-client.ts    — HTTP client for calling existing API routes (Option A)
    auth.ts          — Auth handling for MCP requests
```

---

## Priority Order

1. **Tasks + Categories** — core data, most useful immediately
2. **Weekly Plan + Timetable** — scheduling is the main conversational use case
3. **Time Records + Completed Tasks** — tracking and history
4. **Compound tools** — quality-of-life, add after basics work
5. **User Info** — trivial, do whenever
