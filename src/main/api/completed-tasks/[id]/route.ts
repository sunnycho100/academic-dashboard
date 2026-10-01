import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

const UpdateCompletedTaskSchema = z.object({
  deleted: z.boolean().optional(),
  taskTitle: z.string().min(1).max(255).optional(),
  categoryName: z.string().min(1).max(255).optional(),
  categoryColor: z.string().min(1).max(100).optional(),
  taskType: z.string().min(1).max(100).optional(),
  actualTimeSpent: z.number().nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.completedTask.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const parsed = UpdateCompletedTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    // Soft-delete / restore
    if (body.deleted !== undefined) {
      const task = await prisma.completedTask.update({
        where: { id },
        data: {
          deletedAt: body.deleted ? new Date() : null,
        },
      })
      return Response.json(task)
    }

    // General field update
    const data: Record<string, unknown> = {}
    if (body.taskTitle !== undefined) data.taskTitle = body.taskTitle
    if (body.categoryName !== undefined) data.categoryName = body.categoryName
    if (body.categoryColor !== undefined) data.categoryColor = body.categoryColor
    if (body.taskType !== undefined) data.taskType = body.taskType
    if (body.actualTimeSpent !== undefined) data.actualTimeSpent = body.actualTimeSpent
    if (body.estimatedDuration !== undefined) data.estimatedDuration = body.estimatedDuration
    if (body.notes !== undefined) data.notes = body.notes

    // Recalculate timeDifference when either time value changes
    if (body.actualTimeSpent !== undefined || body.estimatedDuration !== undefined) {
      const est = body.estimatedDuration ?? existing.estimatedDuration
      const act = body.actualTimeSpent ?? existing.actualTimeSpent
      data.timeDifference = est != null && act != null ? est - act : null
    }

    const task = await prisma.completedTask.update({
      where: { id },
      data,
    })

    return Response.json(task)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to update completed task:', error)
    return Response.json(
      { error: 'Failed to update completed task' },
      { status: 500 }
    )
  }
}

/** Hard delete: used when a completion is undone, so it never counted */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params
    const { count } = await prisma.completedTask.deleteMany({ where: { id, userId } })
    if (count === 0) return Response.json({ error: 'Not found' }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete completed task:', error)
    return Response.json({ error: 'Failed to delete completed task' }, { status: 500 })
  }
}
