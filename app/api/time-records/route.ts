import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const QueryParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tz: z.coerce.number().int().min(-720).max(720).optional(),
  startHour: z.coerce.number().int().min(0).max(23).optional(),
  endHour: z.coerce.number().int().min(0).max(23).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paramsParsed = QueryParamsSchema.safeParse({
      date: searchParams.get('date') ?? undefined,
      tz: searchParams.get('tz') ?? undefined,
      startHour: searchParams.get('startHour') ?? undefined,
      endHour: searchParams.get('endHour') ?? undefined,
    })
    if (!paramsParsed.success) {
      return NextResponse.json({ error: paramsParsed.error.flatten() }, { status: 400 })
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

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Failed to fetch time records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const record = await prisma.timeRecord.create({
      data: {
        taskId: body.taskId ?? null,
        taskTitle: body.taskTitle,
        categoryName: body.categoryName,
        categoryColor: body.categoryColor,
        taskType: body.taskType,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        duration: Math.max(0, body.duration),
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Failed to create time record:', error)
    return NextResponse.json(
      { error: 'Failed to create time record' },
      { status: 500 }
    )
  }
}
