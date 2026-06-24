import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerTimetableTools(server: McpServer) {
  server.tool(
    'get_timetable',
    'Get scheduled timetable entries for a specific date. Returns activities with planned/actual times, ordered by display order.',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    },
    async ({ date }) => {
      try {
        const userId = getUserId()
        const dateStr = date ?? new Date().toISOString().split('T')[0]

        const entries = await prisma.timetableEntry.findMany({
          where: { date: dateStr, userId },
          orderBy: { order: 'asc' },
        })
        return success(entries)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch timetable')
      }
    }
  )

  server.tool(
    'get_incomplete_entries',
    'Get unfinished timetable entries from past days (entries with no actualEnd). Useful for finding what was missed.',
    {
      before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Return incomplete entries from dates strictly before this date (YYYY-MM-DD)'),
    },
    async ({ before }) => {
      try {
        const userId = getUserId()

        const entries = await prisma.timetableEntry.findMany({
          where: {
            userId,
            date: { lt: before },
            activityName: { not: '' },
            OR: [
              { actualEnd: null },
              { actualEnd: '' },
            ],
          },
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
        })
        return success(entries)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch incomplete entries')
      }
    }
  )

  server.tool(
    'create_timetable_entry',
    'Add a single scheduled block to the timetable for a given date.',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
      activityName: z.string().max(255).describe('Name of the activity (e.g. "9am Lecture", "Study Session")'),
      plannedStart: z.string().max(10).describe('Planned start time in HH:mm format'),
      plannedEnd: z.string().max(10).describe('Planned end time in HH:mm format'),
      expectedMinutes: z.number().int().min(0).describe('Expected duration in minutes'),
      order: z.number().int().min(0).optional().describe('Display order within the day (defaults to 0)'),
      actualStart: z.string().max(10).nullable().optional().describe('Actual start time in HH:mm format'),
      actualEnd: z.string().max(10).nullable().optional().describe('Actual end time in HH:mm format'),
      actualMinutes: z.number().int().min(0).nullable().optional().describe('Actual duration in minutes'),
      notes: z.string().max(2000).optional().describe('Notes for this entry'),
    },
    async (params) => {
      try {
        const userId = getUserId()

        const entry = await prisma.timetableEntry.create({
          data: {
            userId,
            date: params.date,
            order: params.order ?? 0,
            plannedStart: params.plannedStart,
            plannedEnd: params.plannedEnd,
            expectedMinutes: params.expectedMinutes,
            activityName: params.activityName,
            actualStart: params.actualStart ?? null,
            actualEnd: params.actualEnd ?? null,
            actualMinutes: params.actualMinutes ?? null,
            notes: params.notes ?? '',
          },
        })
        return success(entry)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to create timetable entry')
      }
    }
  )

  server.tool(
    'bulk_update_timetable',
    'Replace all timetable entries for a given date. Deletes existing entries and creates the new set. Use for full day rewrites.',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date to update (YYYY-MM-DD)'),
      entries: z.array(z.object({
        order: z.number().describe('Display order'),
        plannedStart: z.string().describe('Planned start (HH:mm)'),
        plannedEnd: z.string().describe('Planned end (HH:mm)'),
        expectedMinutes: z.number().describe('Expected minutes'),
        activityName: z.string().describe('Activity name'),
        actualStart: z.string().nullable().describe('Actual start or null'),
        actualEnd: z.string().nullable().describe('Actual end or null'),
        actualMinutes: z.number().nullable().describe('Actual minutes or null'),
        notes: z.string().describe('Notes'),
      })).describe('Full set of entries for the day'),
    },
    async ({ date, entries }) => {
      try {
        const userId = getUserId()

        await prisma.timetableEntry.deleteMany({ where: { date, userId } })

        const created = []
        for (const e of entries) {
          const entry = await prisma.timetableEntry.create({
            data: {
              userId,
              date,
              order: e.order,
              plannedStart: e.plannedStart,
              plannedEnd: e.plannedEnd,
              expectedMinutes: e.expectedMinutes,
              activityName: e.activityName,
              actualStart: e.actualStart,
              actualEnd: e.actualEnd,
              actualMinutes: e.actualMinutes,
              notes: e.notes,
            },
          })
          created.push(entry)
        }

        return success(created)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update timetable')
      }
    }
  )
}
