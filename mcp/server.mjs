#!/usr/bin/env node
// Claude connector (MCP, stdio) for Academic Dashboard. It talks to the running app through
// the app's local bridge (src/main/bridge.ts): the port and secret are in bridge.json in the
// app's folder, written each time the app starts. The app has to be open.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const APP_DIR = process.env.ACADEMIC_DASHBOARD_USER_DATA ?? path.join(os.homedir(), 'Library', 'Application Support', 'Academic Dashboard')

async function call(method, route, body) {
  let bridge
  try {
    bridge = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'bridge.json'), 'utf8'))
  } catch {
    throw new Error('Academic Dashboard is not running. Open the app and try again.')
  }
  const res = await fetch(`http://127.0.0.1:${bridge.port}${route}`, {
    method,
    headers: { Authorization: `Bearer ${bridge.token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new Error('Academic Dashboard is not running. Open the app and try again.')
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : `The app answered ${res.status}`)
  return data
}

// ── The app's day: it can run past midnight (Settings > Timer > Day ends at) ──

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function today(state) {
  const start = state.dayBoundaries?.start ?? 6
  const end = state.dayBoundaries?.end ?? 24
  const now = new Date()
  const d = new Date(now)
  if (end > 24 && now.getHours() < end - 24) d.setDate(d.getDate() - 1)
  return { date: ymd(d), start, end }
}

const recordsUrl = (day, date) =>
  `/api/time-records?date=${date}&tz=${new Date().getTimezoneOffset()}&startHour=${day.start}&endHour=${day.end > 24 ? day.end - 24 : 0}`

// ── Formatting for Claude to read ──

const DUE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const minutes = (m) => (!m ? '' : m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`)
const clock = (s) => `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}`

async function snapshot() {
  const [tasks, categories, state] = await Promise.all([call('GET', '/api/tasks'), call('GET', '/api/categories'), call('GET', '/bridge/state')])
  const course = (id) => categories.find((c) => c.id === id)?.name ?? 'No course'
  const startOfDay = new Date(`${today(state).date}T00:00:00`)
  const line = (t) =>
    `- ${t.title} (${course(t.categoryId)}, ${t.type}${t.dueAt ? `, due ${DUE.format(new Date(t.dueAt))}` : ''}${t.estimatedDuration ? `, ${minutes(t.estimatedDuration)}` : ''}) [id ${t.id}]`
  const open = tasks.filter((t) => t.status !== 'done')
  const inToday = open.filter((t) => state.today.includes(t.id))
  const overdue = open.filter((t) => !state.today.includes(t.id) && t.dueAt && new Date(t.dueAt) < startOfDay)
  const upcoming = open.filter((t) => !state.today.includes(t.id) && !(t.dueAt && new Date(t.dueAt) < startOfDay))
  return { tasks: open, categories, state, line, inToday, overdue, upcoming }
}

/** A task by id, or by title (exact first, then the only partial match). */
function findTask(tasks, ref) {
  const byId = tasks.find((t) => t.id === ref)
  if (byId) return byId
  const lower = ref.toLowerCase()
  const exact = tasks.filter((t) => t.title.toLowerCase() === lower)
  if (exact.length === 1) return exact[0]
  const partial = tasks.filter((t) => t.title.toLowerCase().includes(lower))
  if (partial.length === 1) return partial[0]
  throw new Error(
    partial.length ? `More than one task matches "${ref}": ${partial.map((t) => t.title).join(', ')}. Use the id.` : `No open task matches "${ref}".`,
  )
}

const text = (s) => ({ content: [{ type: 'text', text: s }] })

// ── Tools ──

const server = new McpServer({ name: 'academic-dashboard', version: '1.0.0' })

server.tool(
  'list_tasks',
  "Lists open tasks in Academic Dashboard, grouped as the app shows them: Today's plan, Overdue and Upcoming.",
  { group: z.enum(['all', 'today', 'overdue', 'upcoming']).default('all').describe('Which group to list') },
  async ({ group }) => {
    const s = await snapshot()
    const section = (name, list) => `${name} (${list.length})\n${list.map(s.line).join('\n') || '- none'}`
    const parts = { today: section("Today's plan", s.inToday), overdue: section('Overdue', s.overdue), upcoming: section('Upcoming', s.upcoming) }
    return text(group === 'all' ? Object.values(parts).join('\n\n') : parts[group])
  },
)

server.tool('list_courses', 'Lists the courses (task categories) in Academic Dashboard.', {}, async () => {
  const categories = await call('GET', '/api/categories')
  return text(categories.map((c) => `- ${c.name}`).join('\n') || 'No courses yet.')
})

server.tool(
  'add_task',
  'Adds a task to Academic Dashboard. A task due before today shows under Overdue. Set add_to_today to put it in Today\'s plan.',
  {
    title: z.string().min(1),
    course: z.string().describe('Course name as listed by list_courses (a partial name works if it matches one course)'),
    type: z.string().default('homework').describe('e.g. homework, lecture, reading, lab, exam, assignment'),
    due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Due date as YYYY-MM-DD'),
    estimate_minutes: z.number().int().positive().optional(),
    add_to_today: z.boolean().default(false),
  },
  async ({ title, course, type, due, estimate_minutes, add_to_today }) => {
    const categories = await call('GET', '/api/categories')
    const lower = course.toLowerCase()
    const matches = categories.filter((c) => c.name.toLowerCase() === lower || c.name.toLowerCase().includes(lower))
    const cat = matches.find((c) => c.name.toLowerCase() === lower) ?? (matches.length === 1 ? matches[0] : null)
    if (!cat) throw new Error(`Course "${course}" ${matches.length ? 'matches more than one course' : 'not found'}. Courses: ${categories.map((c) => c.name).join(', ')}`)
    // Due at the end of that day, like the app's due date picker
    const dueAt = due ? new Date(`${due}T23:59:00`).toISOString() : null
    const task = await call('POST', '/api/tasks', { title, type, categoryId: cat.id, dueAt, estimatedDuration: estimate_minutes ?? null })
    if (add_to_today) await call('POST', '/bridge/today', { taskId: task.id })
    return text(`Added "${title}" to ${cat.name}${due ? `, due ${DUE.format(new Date(dueAt))}` : ''}${add_to_today ? ", in Today's plan" : ''}. [id ${task.id}]`)
  },
)

server.tool(
  'add_to_today',
  "Puts an existing task into Today's plan in Academic Dashboard, by id or title.",
  { task: z.string().describe('Task id or title') },
  async ({ task }) => {
    const s = await snapshot()
    const t = findTask(s.tasks, task)
    await call('POST', '/bridge/today', { taskId: t.id })
    return text(`"${t.title}" is in Today's plan.`)
  },
)

server.tool(
  'complete_task',
  'Marks a task done in Academic Dashboard (it moves to Done today with the time recorded on it). Pause its timer in the app first if one is running.',
  { task: z.string().describe('Task id or title') },
  async ({ task }) => {
    const s = await snapshot()
    const t = findTask(s.tasks, task)
    await call('POST', `/api/tasks/${t.id}/complete`)
    return text(`Completed "${t.title}".`)
  },
)

server.tool(
  'plan_time_block',
  "Plans a time block on the day's timeline (the Planned lane; saved in the Timetable).",
  {
    title: z.string().min(1),
    start: z.string().regex(/^\d{1,2}:\d{2}$/).describe('Start time, 24-hour HH:MM'),
    minutes: z.number().int().positive().default(60).describe('Length in minutes (ignored if end is given)'),
    end: z.string().regex(/^\d{1,2}:\d{2}$/).optional().describe('End time, 24-hour HH:MM'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Day as YYYY-MM-DD; defaults to today'),
  },
  async ({ title, start, minutes: length, end, date }) => {
    const state = await call('GET', '/bridge/state')
    const day = date ?? today(state).date
    const toMin = (hhmm) => Number(hhmm.split(':')[0]) * 60 + Number(hhmm.split(':')[1])
    const hhmm = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad(m % 60)}`
    const s = toMin(start)
    let e = end ? toMin(end) : s + length
    if (e <= s) e += 1440 // runs past midnight
    const rows = await call('GET', `/api/timetable?date=${day}`)
    // Keep the existing plan (minus the Timetable's blank padding rows), in time order
    const kept = rows.filter((r) => r.activityName || r.plannedStart || r.plannedEnd || r.actualStart || r.actualEnd)
    const entry = { order: 0, plannedStart: hhmm(s), plannedEnd: hhmm(e), expectedMinutes: e - s, activityName: title, actualStart: null, actualEnd: null, actualMinutes: null, notes: '' }
    const entries = [...kept, entry]
      .sort((a, b) => (a.plannedStart || '99:99').localeCompare(b.plannedStart || '99:99'))
      .map((r, order) => ({ ...r, order }))
    await call('PUT', '/api/timetable', { date: day, entries })
    return text(`Planned "${title}" ${hhmm(s)} to ${hhmm(e)} on ${day}.`)
  },
)

server.tool(
  'list_time_blocks',
  "Lists the planned time blocks for a day (the timeline's Planned lane).",
  { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Day as YYYY-MM-DD; defaults to today') },
  async ({ date }) => {
    const state = await call('GET', '/bridge/state')
    const day = date ?? today(state).date
    const rows = (await call('GET', `/api/timetable?date=${day}`)).filter((r) => r.activityName)
    return text(rows.map((r) => `- ${r.plannedStart || '?'} to ${r.plannedEnd || '?'} ${r.activityName}`).join('\n') || `Nothing planned on ${day}.`)
  },
)

server.tool('today_summary', "Today's tracked time in Academic Dashboard, by task, and what it earned at the hourly value.", {}, async () => {
  const state = await call('GET', '/bridge/state')
  const day = today(state)
  const records = await call('GET', recordsUrl(day, day.date))
  const total = records.reduce((s, r) => s + r.duration, 0)
  const byTask = {}
  for (const r of records) byTask[r.taskTitle] = (byTask[r.taskTitle] ?? 0) + r.duration
  const earned = ((total / 3600) * state.hourlyRate).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const lines = Object.entries(byTask)
    .sort((a, b) => b[1] - a[1])
    .map(([title, s]) => `- ${title}: ${clock(s)}`)
  return text(`${day.date}: ${clock(total)} tracked, ${earned} earned (saved records; a timer running now adds when it stops)\n${lines.join('\n')}`)
})

await server.connect(new StdioServerTransport())
