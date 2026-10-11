import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

const CreateTimeRecordSchema = z.object({
  taskId: z.string().max(255).nullable().optional(),
  taskTitle: z.string().min(1).max(255),
  categoryName: z.string().min(1).max(255),
  categoryColor: z.string().min(1).max(100),
  taskType: z.string().min(1).max(100),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  duration: z.number().int().min(0).max(86400),
  /** Carries on the record that ended where this one starts (the app was closed and reopened) */
  continues: z.boolean().optional(),
})

const QueryParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tz: z.coerce.number().int().min(-720).max(720).optional(),
  startHour: z.coerce.number().int().min(0).max(23).optional(),
  endHour: z.coerce.number().int().min(0).max(23).optional(),
  /** Comma-separated task ids: every record for those tasks, on any day */
  taskIds: z.string().max(5000).optional(),
})

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const paramsParsed = QueryParamsSchema.safeParse({
      date: searchParams.get('date') ?? undefined,
      tz: searchParams.get('tz') ?? undefined,
      startHour: searchParams.get('startHour') ?? undefined,
      endHour: searchParams.get('endHour') ?? undefined,
      taskIds: searchParams.get('taskIds') ?? undefined,
    })
    if (!paramsParsed.success) {
      return Response.json({ error: paramsParsed.error.flatten() }, { status: 400 })
    }
    if (paramsParsed.data.taskIds !== undefined) {
      const ids = paramsParsed.data.taskIds.split(',').filter(Boolean)
      const records = await prisma.timeRecord.findMany({
        where: { userId, taskId: { in: ids } },
        orderBy: { startTime: 'asc' },
      })
      return Response.json(records)
    }
    const dateParam = paramsParsed.data.date ?? null
    const tzOffset = paramsParsed.data.tz ?? new Date().getTimezoneOffset()
    const startHourOffset = paramsParsed.data.startHour ?? 0
    const endHourExtension = paramsParsed.data.endHour ?? 0

    let startOfDay: Date
    let endOfDay: Date

    if (dateParam) {
      // Build UTC boundaries for the user's local day
      // The day starts at startHourOffset (e.g. 10 AM) on the selected date
      // and ends at endHourExtension (e.g. 3 AM) on the next date
      // tzOffset is in minutes, positive = behind UTC (e.g. CST = 360)
      startOfDay = new Date(`${dateParam}T00:00:00.000Z`)
      startOfDay.setMinutes(startOfDay.getMinutes() + tzOffset)
      startOfDay.setHours(startOfDay.getHours() + startHourOffset)

      // End of day: midnight of the next calendar day + any extension
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
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    })

    // Sanitize: recalculate negative durations (from pre-fix midnight-crossing records)
    const sanitized = records.map((r: typeof records[number]) => {
      if (r.duration < 0) {
        const corrected = Math.round((r.endTime.getTime() - r.startTime.getTime()) / 1000)
        return { ...r, duration: corrected < 0 ? corrected + 86400 : corrected }
      }
      return r
    })

    return Response.json(sanitized)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch time records:', error)
    return Response.json(
      { error: 'Failed to fetch time records' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateTimeRecordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Reopening the app mid-session: extend the record this stretch carries on (it ended,
    // within a couple of seconds, where this one starts) instead of storing a second piece
    if (body.continues) {
      const previous = await prisma.timeRecord.findFirst({
        where: {
          userId,
          taskTitle: body.taskTitle,
          categoryName: body.categoryName,
          endTime: { gte: new Date(startTime.getTime() - 2000), lte: new Date(startTime.getTime() + 2000) },
        },
        orderBy: { endTime: 'desc' },
      })
      if (previous) {
        const record = await prisma.timeRecord.update({
          where: { id: previous.id },
          data: { endTime, duration: Math.round((endTime.getTime() - previous.startTime.getTime()) / 1000) },
        })
        return Response.json(record, { status: 200 })
      }
    }

    // A segment is identified by what it timed and when it started, enforced by a unique
    // index. Saving it again (e.g. flushed when the app reloads at midnight, then saved on
    // pause) extends the same record instead of storing the overlapping time twice.
    try {
      const record = await prisma.timeRecord.create({
        data: {
          userId,
          taskId: body.taskId ?? null,
          taskTitle: body.taskTitle,
          categoryName: body.categoryName,
          categoryColor: body.categoryColor,
          taskType: body.taskType,
          startTime,
          endTime,
          duration: body.duration,
        },
      })
      return Response.json(record, { status: 201 })
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error
    }
    const existing = await prisma.timeRecord.findUniqueOrThrow({
      where: {
        userId_startTime_taskTitle_categoryName: { userId, startTime, taskTitle: body.taskTitle, categoryName: body.categoryName },
      },
    })
    const record =
      endTime > existing.endTime
        ? await prisma.timeRecord.update({ where: { id: existing.id }, data: { endTime, duration: body.duration } })
        : existing
    return Response.json(record, { status: 200 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to create time record:', error)
    return Response.json(
      { error: 'Failed to create time record' },
      { status: 500 }
    )
  }
}
