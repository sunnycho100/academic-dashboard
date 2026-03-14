import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

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
 * Returns all timetable entries for a given date (or today if omitted).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    const entries = await prisma.timetableEntry.findMany({
      where: { date },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const entry = await prisma.timetableEntry.create({
      data: {
        date: body.date,
        order: body.order ?? 0,
        plannedStart: body.plannedStart ?? '',
        plannedEnd: body.plannedEnd ?? '',
        expectedMinutes: body.expectedMinutes ?? 0,
        activityName: body.activityName ?? '',
        actualStart: body.actualStart ?? null,
        actualEnd: body.actualEnd ?? null,
        actualMinutes: body.actualMinutes ?? null,
        notes: body.notes ?? '',
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
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
    const parsed = BulkUpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { date, entries } = parsed.data

    // Delete all existing entries for this date
    await prisma.timetableEntry.deleteMany({ where: { date } })

    // Recreate them
    const created = []
    for (const e of entries) {
      const entry = await prisma.timetableEntry.create({
        data: {
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
    console.error('Failed to update timetable entries:', error)
    return NextResponse.json(
      { error: 'Failed to update timetable entries' },
      { status: 500 },
    )
  }
}
