import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date') // YYYY-MM-DD
    const tzOffsetParam = searchParams.get('tz') // minutes offset from UTC
    const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam, 10) : new Date().getTimezoneOffset()
    // startHour: hour-of-day when the user's day starts (e.g. 10 = 10 AM)
    const startHourParam = searchParams.get('startHour')
    const startHourOffset = startHourParam ? parseInt(startHourParam, 10) : 0
    // endHour: hours past midnight to extend the day window (e.g. 3 = until 3 AM next day)
    const endHourParam = searchParams.get('endHour')
    const endHourExtension = endHourParam ? parseInt(endHourParam, 10) : 0

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

    return NextResponse.json(records)
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
        duration: body.duration,
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
