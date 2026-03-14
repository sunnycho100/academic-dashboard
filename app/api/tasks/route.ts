import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  dueAt: z.string().nullable().optional(),
  status: z.string().optional(),
  priorityOrder: z.number().optional(),
  notes: z.string().nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  actualTimeSpent: z.number().nullable().optional(),
  categoryId: z.string().min(1),
})

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { priorityOrder: 'asc' },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    await prisma.task.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete all tasks:', error)
    return NextResponse.json(
      { error: 'Failed to delete all tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = CreateTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data
    const task = await prisma.task.create({
      data: {
        title: body.title,
        type: body.type,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: body.status ?? 'todo',
        priorityOrder: body.priorityOrder ?? 0,
        notes: body.notes ?? null,
        estimatedDuration: body.estimatedDuration ?? null,
        actualTimeSpent: body.actualTimeSpent ?? null,
        categoryId: body.categoryId,
      },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
