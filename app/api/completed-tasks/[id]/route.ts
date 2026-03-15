import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.completedTask.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsed = UpdateCompletedTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
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
      return NextResponse.json(task)
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

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to update completed task:', error)
    return NextResponse.json(
      { error: 'Failed to update completed task' },
      { status: 500 }
    )
  }
}
