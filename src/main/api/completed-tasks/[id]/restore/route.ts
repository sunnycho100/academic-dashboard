import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

const RestoreSchema = z.object({
  categoryId: z.string().min(1).max(255),
  priorityOrder: z.number().int().min(0).optional(),
})

/**
 * Undo a completion: recreate the active task and delete the completed record in one
 * transaction, so a reload can never see it in both places or in neither.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params
    const parsed = RestoreSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const done = await prisma.completedTask.findUnique({ where: { id } })
    if (!done || done.userId !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const [task] = await prisma.$transaction([
      prisma.task.create({
        data: {
          title: done.taskTitle,
          type: done.taskType,
          dueAt: done.dueAt,
          status: 'todo',
          priorityOrder: parsed.data.priorityOrder ?? 0,
          notes: done.notes,
          estimatedDuration: done.estimatedDuration,
          actualTimeSpent: done.actualTimeSpent,
          categoryId: parsed.data.categoryId,
          userId,
        },
      }),
      prisma.completedTask.delete({ where: { id } }),
    ])
    return Response.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to restore completed task:', error)
    return Response.json({ error: 'Failed to restore completed task' }, { status: 500 })
  }
}
