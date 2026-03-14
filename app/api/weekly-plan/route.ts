import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateWeeklyPlanSchema = z.object({
  taskId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
})

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

  try {
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
  } catch (error) {
    console.error('Failed to fetch weekly plan:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly plan' }, { status: 500 })
  }
}

/**
 * POST /api/weekly-plan
 * Body: { taskId: string, date: string (YYYY-MM-DD) }
 * Assigns a task to a specific day.
 */
export async function POST(req: NextRequest) {
  const parsed = CreateWeeklyPlanSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { taskId, date } = parsed.data

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
    console.error('Failed to create weekly plan entry:', err)
    return NextResponse.json({ error: 'Failed to create weekly plan entry' }, { status: 500 })
  }
}

/**
 * DELETE /api/weekly-plan
 * Body: { id: string } — removes a single weekly plan entry
 */
const DeleteWeeklyPlanSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  const parsed = DeleteWeeklyPlanSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await prisma.weeklyPlanEntry.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Failed to delete weekly plan entry:', error)
    return NextResponse.json({ error: 'Failed to delete weekly plan entry' }, { status: 500 })
  }
}
