import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const TimetableEntrySchema = z.object({
  id: z.string().optional(),
  order: z.number(),
  plannedStart: z.string(),
  plannedEnd: z.string(),
  expectedMinutes: z.number(),
  activityName: z.string(),
  actualStart: z.string().nullable(),
  actualEnd: z.string().nullable(),
  actualMinutes: z.number().nullable(),
  notes: z.string(),
})

const BulkUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  entries: z.array(TimetableEntrySchema),
})

/**
 * GET /api/timetable?date=YYYY-MM-DD
 * GET /api/timetable?incompleteBefore=YYYY-MM-DD
 *   Returns incomplete entries (no actualEnd) from dates strictly before the given date.
 * Returns all timetable entries for a given date (or today if omitted).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)

    // Fetch incomplete entries from previous days
    const incompleteBefore = searchParams.get('incompleteBefore')
    if (incompleteBefore) {
      const entries = await prisma.timetableEntry.findMany({
        where: {
          userId,
          date: { lt: incompleteBefore },
          activityName: { not: '' },
          OR: [
            { actualEnd: null },
            { actualEnd: '' },
          ],
        },
        orderBy: [{ date: 'asc' }, { order: 'asc' }],
      })
      return NextResponse.json(entries)
    }

    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    const entries = await prisma.timetableEntry.findMany({
      where: { date, userId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch timetable entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetable entries' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/timetable
 * Create a new timetable entry.
 */
const CreateTimetableEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  order: z.number().int().min(0).default(0),
  plannedStart: z.string().max(10).default(''),
  plannedEnd: z.string().max(10).default(''),
  expectedMinutes: z.number().int().min(0).default(0),
  activityName: z.string().max(255).default(''),
  actualStart: z.string().max(10).nullable().default(null),
  actualEnd: z.string().max(10).nullable().default(null),
  actualMinutes: z.number().int().min(0).nullable().default(null),
  notes: z.string().max(2000).default(''),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateTimetableEntrySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    const entry = await prisma.timetableEntry.create({
      data: {
        userId,
        date: body.date,
        order: body.order,
        plannedStart: body.plannedStart,
        plannedEnd: body.plannedEnd,
        expectedMinutes: body.expectedMinutes,
        activityName: body.activityName,
        actualStart: body.actualStart,
        actualEnd: body.actualEnd,
        actualMinutes: body.actualMinutes,
        notes: body.notes,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to create timetable entry:', error)
    return NextResponse.json(
      { error: 'Failed to create timetable entry' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/timetable
 * Bulk update — replaces all entries for a given date.
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = BulkUpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { date, entries } = parsed.data

    // Delete all existing entries for this date scoped to user
    await prisma.timetableEntry.deleteMany({ where: { date, userId } })

    // Recreate them
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

    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to update timetable entries:', error)
    return NextResponse.json(
      { error: 'Failed to update timetable entries' },
      { status: 500 },
    )
  }
}
