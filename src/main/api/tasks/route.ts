import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  dueAt: z.string().max(50).nullable().optional(),
  status: z.string().max(50).optional(),
  priorityOrder: z.number().int().min(0).optional(),
  notes: z.string().max(5000).nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  actualTimeSpent: z.number().nullable().optional(),
  categoryId: z.string().min(1).max(255),
})

export async function GET() {
  try {
    const userId = await getAuthenticatedUser()
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { priorityOrder: 'asc' },
    })
    return Response.json(tasks)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch tasks:', error)
    return Response.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const userId = await getAuthenticatedUser()
    await prisma.task.deleteMany({ where: { userId } })
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete all tasks:', error)
    return Response.json(
      { error: 'Failed to delete all tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
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
        userId,
      },
    })
    return Response.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to create task:', error)
    return Response.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
