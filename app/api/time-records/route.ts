import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date') // YYYY-MM-DD

    let startOfDay: Date
    let endOfDay: Date

    if (dateParam) {
      startOfDay = new Date(dateParam + 'T00:00:00')
      endOfDay = new Date(dateParam + 'T23:59:59.999')
    } else {
      // Default to today
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
