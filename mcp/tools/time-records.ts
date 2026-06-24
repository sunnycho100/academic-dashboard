import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerTimeRecordTools(server: McpServer) {
  server.tool(
    'get_time_records',
    'Get work session records for a specific date. Supports timezone offset for accurate day boundaries. Returns records ordered by start time.',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      tz: z.number().int().min(-720).max(720).optional().describe('Timezone offset in minutes from UTC (e.g. 360 for CST). Defaults to server timezone.'),
      startHour: z.number().int().min(0).max(23).optional().describe('Day start hour offset (e.g. 10 means day starts at 10 AM)'),
      endHour: z.number().int().min(0).max(23).optional().describe('End-of-day extension hours past midnight'),
    },
    async ({ date, tz, startHour, endHour }) => {
      try {
        const userId = getUserId()
        const dateParam = date ?? null
        const tzOffset = tz ?? new Date().getTimezoneOffset()
        const startHourOffset = startHour ?? 0
        const endHourExtension = endHour ?? 0

        let startOfDay: Date
        let endOfDay: Date

        if (dateParam) {
          startOfDay = new Date(`${dateParam}T00:00:00.000Z`)
          startOfDay.setMinutes(startOfDay.getMinutes() + tzOffset)
          startOfDay.setHours(startOfDay.getHours() + startHourOffset)

          endOfDay = new Date(`${dateParam}T23:59:59.999Z`)
          endOfDay.setMinutes(endOfDay.getMinutes() + tzOffset)
          if (endHourExtension > 0) {
            endOfDay.setHours(endOfDay.getHours() + endHourExtension)
          }
        } else {
          const now = new Date()
          startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        }

        const records = await prisma.timeRecord.findMany({
          where: {
            userId,
            startTime: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { startTime: 'asc' },
        })

        const sanitized = records.map((r: typeof records[number]) => {
          if (r.duration < 0) {
            const corrected = Math.round((r.endTime.getTime() - r.startTime.getTime()) / 1000)
            return { ...r, duration: corrected < 0 ? corrected + 86400 : corrected }
          }
          return r
        })

        return success(sanitized)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch time records')
      }
    }
  )

  server.tool(
    'create_time_record',
    'Log a work session with start/end times and duration. Times are denormalized — stores task/category names directly.',
    {
      taskTitle: z.string().min(1).max(255).describe('Title of the task worked on'),
      categoryName: z.string().min(1).max(255).describe('Category name'),
      categoryColor: z.string().min(1).max(100).describe('Category color'),
      taskType: z.string().min(1).max(100).describe('Task type'),
      startTime: z.string().min(1).describe('Session start time as ISO string'),
      endTime: z.string().min(1).describe('Session end time as ISO string'),
      duration: z.number().int().min(0).max(86400).describe('Duration in seconds'),
      taskId: z.string().nullable().optional().describe('Task ID (nullable — task may not exist)'),
    },
    async (params) => {
      try {
        const userId = getUserId()

        const startTime = new Date(params.startTime)
        const endTime = new Date(params.endTime)
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return error('Invalid date format for startTime or endTime')
        }

        const record = await prisma.timeRecord.create({
          data: {
            userId,
            taskId: params.taskId ?? null,
            taskTitle: params.taskTitle,
            categoryName: params.categoryName,
            categoryColor: params.categoryColor,
            taskType: params.taskType,
            startTime,
            endTime,
            duration: params.duration,
          },
        })
        return success(record)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to create time record')
      }
    }
  )

  server.tool(
    'update_time_record',
    'Update an existing time record. Automatically recalculates duration if start/end times change.',
    {
      id: z.string().describe('Time record ID to update'),
      taskTitle: z.string().min(1).max(255).optional().describe('Updated task title'),
      categoryName: z.string().min(1).max(255).optional().describe('Updated category name'),
      categoryColor: z.string().min(1).max(100).optional().describe('Updated category color'),
      taskType: z.string().min(1).max(100).optional().describe('Updated task type'),
      startTime: z.string().optional().describe('Updated start time as ISO string'),
      endTime: z.string().optional().describe('Updated end time as ISO string'),
      duration: z.number().int().min(0).max(86400).optional().describe('Updated duration in seconds'),
    },
    async ({ id, ...fields }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.timeRecord.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Time record not found')
        }

        const data: Record<string, unknown> = {}
        if (fields.taskTitle !== undefined) data.taskTitle = fields.taskTitle
        if (fields.categoryName !== undefined) data.categoryName = fields.categoryName
        if (fields.categoryColor !== undefined) data.categoryColor = fields.categoryColor
        if (fields.taskType !== undefined) data.taskType = fields.taskType

        if (fields.startTime !== undefined) {
          const st = new Date(fields.startTime)
          if (isNaN(st.getTime())) return error('Invalid startTime')
          data.startTime = st
        }
        if (fields.endTime !== undefined) {
          const et = new Date(fields.endTime)
          if (isNaN(et.getTime())) return error('Invalid endTime')
          data.endTime = et
        }
        if (fields.duration !== undefined) data.duration = fields.duration

        if (fields.startTime && fields.endTime && fields.duration === undefined) {
          let dur = Math.round(
            (new Date(fields.endTime).getTime() - new Date(fields.startTime).getTime()) / 1000
          )
          if (dur < 0) dur += 86400
          data.duration = dur
        }

        const record = await prisma.timeRecord.update({
          where: { id },
          data,
        })
        return success(record)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update time record')
      }
    }
  )

  server.tool(
    'delete_time_record',
    'Delete a time record by ID.',
    {
      id: z.string().describe('Time record ID to delete'),
    },
    async ({ id }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.timeRecord.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Time record not found')
        }

        await prisma.timeRecord.delete({ where: { id } })
        return success({ deleted: true, id })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to delete time record')
      }
    }
  )
}
