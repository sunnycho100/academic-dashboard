import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

const CreateWeeklyPlanSchema = z.object({
  taskId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
})

/**
 * GET /api/weekly-plan?weekStart=YYYY-MM-DD
 * Returns all weekly plan entries for the 7-day window starting at weekStart.
 * Each entry includes the full task + category data.
 */
export async function GET(req: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const weekStart = new URL(req.url).searchParams.get('weekStart')
    if (!weekStart) {
      return Response.json({ error: 'weekStart required' }, { status: 400 })
    }

    const start = new Date(weekStart + 'T00:00:00.000Z')
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const entries = await prisma.weeklyPlanEntry.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      include: {
        task: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return Response.json(entries)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch weekly plan:', error)
    return Response.json({ error: 'Failed to fetch weekly plan' }, { status: 500 })
  }
}

/**
 * POST /api/weekly-plan
 * Body: { taskId: string, date: string (YYYY-MM-DD) }
 * Assigns a task to a specific day.
 */
export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateWeeklyPlanSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { taskId, date } = parsed.data

    const dateObj = new Date(date + 'T00:00:00.000Z')

    const entry = await prisma.weeklyPlanEntry.create({
      data: { taskId, date: dateObj, userId },
      include: {
        task: {
          include: { category: true },
        },
      },
    })
    return Response.json(entry)
  } catch (err: unknown) {
    if (err instanceof Response) return err
    // Unique constraint violation — task already planned for this day
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return Response.json({ error: 'Task already planned for this day' }, { status: 409 })
    }
    console.error('Failed to create weekly plan entry:', err)
    return Response.json({ error: 'Failed to create weekly plan entry' }, { status: 500 })
  }
}

/**
 * DELETE /api/weekly-plan
 * Body: { id: string } — removes a single weekly plan entry
 */
const DeleteWeeklyPlanSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(req: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = DeleteWeeklyPlanSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await prisma.weeklyPlanEntry.deleteMany({
      where: { id: parsed.data.id, userId },
    })
    return Response.json({ deleted: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete weekly plan entry:', error)
    return Response.json({ error: 'Failed to delete weekly plan entry' }, { status: 500 })
  }
}
