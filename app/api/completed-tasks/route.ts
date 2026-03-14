import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateCompletedTaskSchema = z.object({
  taskTitle: z.string().min(1),
  categoryName: z.string().min(1),
  categoryColor: z.string().min(1),
  taskType: z.string().min(1),
  estimatedDuration: z.number().nullable().optional(),
  actualTimeSpent: z.number().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const tasks = await prisma.completedTask.findMany({
      where: { deletedAt: null },
      orderBy: { completedAt: 'desc' },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch completed tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = CreateCompletedTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    const timeDifference =
      body.estimatedDuration != null && body.actualTimeSpent != null
        ? body.estimatedDuration - body.actualTimeSpent
        : null

    const task = await prisma.completedTask.create({
      data: {
        taskTitle: body.taskTitle,
        categoryName: body.categoryName,
        categoryColor: body.categoryColor,
        taskType: body.taskType,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        actualTimeSpent: body.actualTimeSpent ?? null,
        estimatedDuration: body.estimatedDuration ?? null,
        timeDifference,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create completed task:', error)
    return NextResponse.json(
      { error: 'Failed to create completed task' },
      { status: 500 }
    )
  }
}
