import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerWeeklyPlanTools(server: McpServer) {
  server.tool(
    'get_weekly_plan',
    'Get the weekly plan for a 7-day window starting at weekStart. Returns plan entries with full task and category data.',
    {
      weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start of the week in YYYY-MM-DD format'),
    },
    async ({ weekStart }) => {
      try {
        const userId = getUserId()

        const start = new Date(weekStart + 'T00:00:00.000Z')
        const end = new Date(start)
        end.setDate(end.getDate() + 7)

        const entries = await prisma.weeklyPlanEntry.findMany({
          where: {
            userId,
            date: { gte: start, lt: end },
          },
          include: {
            task: { include: { category: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
        return success(entries)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch weekly plan')
      }
    }
  )

  server.tool(
    'plan_task',
    'Assign a task to a specific day in the weekly plan. A task can only be planned once per day (unique constraint on taskId + date).',
    {
      taskId: z.string().describe('Task ID to plan'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date to plan the task for (YYYY-MM-DD)'),
    },
    async ({ taskId, date }) => {
      try {
        const userId = getUserId()
        const dateObj = new Date(date + 'T00:00:00.000Z')

        const entry = await prisma.weeklyPlanEntry.create({
          data: { taskId, date: dateObj, userId },
          include: {
            task: { include: { category: true } },
          },
        })
        return success(entry)
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          return error('Task is already planned for this day')
        }
        return error(err instanceof Error ? err.message : 'Failed to plan task')
      }
    }
  )

  server.tool(
    'unplan_task',
    'Remove a task from the weekly plan by plan entry ID.',
    {
      id: z.string().describe('Weekly plan entry ID to remove'),
    },
    async ({ id }) => {
      try {
        const userId = getUserId()

        await prisma.weeklyPlanEntry.deleteMany({
          where: { id, userId },
        })
        return success({ deleted: true, id })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to unplan task')
      }
    }
  )
}
