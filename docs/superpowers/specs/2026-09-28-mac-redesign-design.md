# Mac App Redesign

**Date:** 2026-09-28
**Status:** Draft, awaiting review
**Mockups:** `combined-v1`, `course-color`, `ring-animation` (brainstorm companion)

## Goal

Restyle the Electron app in a warm editorial look (benchmark D: Claude app and Cohere),
restructure the task list around time (benchmark A: Routine, Ellie), and give the Today
panel a focus timer (benchmark C: Flow, Toggl) plus a day timeline. Light is the default.
Every current feature stays; nothing is removed.

## Visual System

| Token | Light | Use |
|---|---|---|
| canvas | `#f7f5ef` ivory | app background |
| sidebar | `#f2efe7` | sidebar background |
| card | `#fcfbf8` | task rows, dialogs |
| line | `#e7e3d9` | 1px hairline borders |
| ink | `#1f1d1a` | text, primary buttons |
| muted | `#625d53` | secondary text (4.5:1 on canvas and sidebar) |
| green | `#003c33` | Today panel background |
| coral | `#ff7759` | only for "running" and "now" (stop button, running badge, now line) |
| danger | `#b3402a` | overdue count, late labels |

- **Type:** serif `Iowan Old Style` (ships with macOS, no bundling) for the title, group
  headings and stat numbers. The system UI font (`-apple-system`, SF Pro) for everything
  else. The timer digits use SF Pro at weight 200 with tabular numbers.
- **Shape:** 12px radius on rows and panels, pill buttons and segmented controls, hairline
  borders, almost no shadow. The glassmorphism (mesh gradient, glass tokens) is removed.
- **Dark mode** keeps working through the same tokens, with dark values, but light is the default.
- Existing course colors stay user-chosen. They appear only on the task ring, the sidebar
  dot, and timeline blocks.

## Layout (Class Catch-up screen)

Three columns: sidebar (about 210px), main list (flexible), and the Today panel (about 330px).

- **Window:** native macOS traffic lights inset into the sidebar (`titleBarStyle: hiddenInset`).
  The header row is a drag region, and its buttons opt out of dragging.
- **Sidebar:** Courses heading, "All tasks" with a count, then each course with its color
  dot and a one-line summary under it ("3 due · next Fri", "1 overdue", "Nothing due").
  Search, add and edit course stay at the top. Time records and Activity summary stay at the bottom.
- **Header:** serif "Class Catch-up" title, a segmented control **Tasks | Weekly plan |
  Timetable** (Weekly plan becomes a tab, no longer a toggle button), then "+ Add task" as
  a dark pill. The settings, personal info and theme icons move to the far right.
- **Stats row:** four inline serif numbers with small uppercase labels: tasks, due soon,
  overdue (danger color), done today. Sort control on the right.
- **Task list:** grouped by time, each group with a serif heading and a muted count:
  - **Today:** the tasks in Today's plan (the existing `todayTaskIds`), in their current order.
  - **Overdue:** past-due tasks not in Today.
  - **Upcoming:** everything else, ordered by the sort option.
  - A "Group by course" option (the existing toggle) switches to course groups instead.
  - The All, Overdue and Due Soon view tabs are removed, because the groups show the same thing.
- **Task row:** the course-colored ring (the complete button), title, a meta line
  ("CS 400 · Assignment"), a time-estimate chip, and a due label. The row actions (add to
  Today, edit, play timer) keep working as today. A running task shows a coral "running" chip.
  Dragging into Today or Weekly plan keeps working. No colored side stripes anywhere.

## Ring Animation

- The ring is an SVG circle: a faint track (`#ddd7ca`) with the course color drawn over it
  **anticlockwise from 12 o'clock** (stroke-dashoffset), in 0.7s with an ease-in-out curve.
- It plays when the list first appears, staggered 90ms per row, and for a newly added
  task (that row only). It does not replay on filter, sort or tab switches.
- With `prefers-reduced-motion`, rings render already colored, with no animation.

## Today Panel (dark green)

From top to bottom:
1. "Today" (serif) and the date.
2. **Focus timer (C):** "Now working on" plus the active task and its course, big thin
   digits (`0:42:10`), a round coral stop button, session dots (done, current as a pill,
   upcoming), and a "Today total" caption. With no timer running, it shows the next Today
   task with a play button instead. It uses the existing `useTaskTimers`, with no new timer logic.
3. **Timeline (A):** an hour ruler for today with a coral "now" line.
   - **Planned lane:** today's Timetable entries (planned start and end), shown as dashed outlines.
   - **Actual lane:** today's TimeRecords, plus the live running segment, as filled blocks.
   - A setting offers **Planned and actual** (default), **Planned only**, or **Actual only**,
     stored as a local UI preference.
   - It auto-scrolls to keep "now" in view. Clicking a planned block opens the Timetable tab.
4. **Personal dev timers** (Reading, Project, Job app) as a compact row at the bottom.

## Other Screens

Weekly plan, Timetable, Time records, Activity summary, settings dialogs, the landing
greeting and the idle overlay are **restyled only** (tokens, type, radius). Their behavior is unchanged.

## Out of Scope

- New data models or migrations. The timeline reads existing Timetable and TimeRecord data.
- App icon and code signing (a separate small task).
- Moving to Tailwind v4. Tokens go in `globals.css` and the Tailwind config as today.

## Testing

- The existing e2e suite must stay green. `views.spec` is rewritten for the time groups
  (Overdue and Upcoming headings instead of tabs).
- New e2e checks: tasks land in the right group, the timeline setting hides each lane,
  and a newly added task gets the ring animation class while existing rows don't.
- A visual check of light and dark themes against the mockups, plus the impeccable detector
  on the result (contrast, sizes).
