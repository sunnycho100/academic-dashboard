import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/weekly-plan?weekStart=YYYY-MM-DD
 * Returns all weekly plan entries for the 7-day window starting at weekStart.
 * Each entry includes the full task + category data.
 */
export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  const start = new Date(weekStart + 'T00:00:00.000Z')
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const entries = await prisma.weeklyPlanEntry.findMany({
    where: {
      date: { gte: start, lt: end },
    },
    include: {
      task: {
        include: { category: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(entries)
}

/**
 * POST /api/weekly-plan
 * Body: { taskId: string, date: string (YYYY-MM-DD) }
 * Assigns a task to a specific day.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { taskId, date } = body

  if (!taskId || !date) {
    return NextResponse.json({ error: 'taskId and date required' }, { status: 400 })
  }

  const dateObj = new Date(date + 'T00:00:00.000Z')

  try {
    const entry = await prisma.weeklyPlanEntry.create({
      data: { taskId, date: dateObj },
      include: {
        task: {
          include: { category: true },
        },
      },
    })
    return NextResponse.json(entry)
  } catch (err: unknown) {
    // Unique constraint violation — task already planned for this day
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Task already planned for this day' }, { status: 409 })
    }
    throw err
  }
}

/**
 * DELETE /api/weekly-plan
 * Body: { id: string } — removes a single weekly plan entry
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  await prisma.weeklyPlanEntry.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
