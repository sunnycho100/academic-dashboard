import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const CreateCompletedTaskSchema = z.object({
  taskTitle: z.string().min(1).max(255),
  categoryName: z.string().min(1).max(255),
  categoryColor: z.string().min(1).max(100),
  taskType: z.string().min(1).max(100),
  estimatedDuration: z.number().nullable().optional(),
  actualTimeSpent: z.number().nullable().optional(),
  dueAt: z.string().max(50).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export async function GET() {
  try {
    const userId = await getAuthenticatedUser()
    const tasks = await prisma.completedTask.findMany({
      where: { userId, deletedAt: null },
      orderBy: { completedAt: 'desc' },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch completed tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
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
        userId,
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
    if (error instanceof Response) return error
    console.error('Failed to create completed task:', error)
    return NextResponse.json(
      { error: 'Failed to create completed task' },
      { status: 500 }
    )
  }
}
