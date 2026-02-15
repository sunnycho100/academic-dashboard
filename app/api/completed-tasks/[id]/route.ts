import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Soft-delete / restore
    if ('deleted' in body) {
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
      // Fetch current record for the other value if not provided
      const current = await prisma.completedTask.findUnique({ where: { id } })
      if (current) {
        const est = body.estimatedDuration ?? current.estimatedDuration
        const act = body.actualTimeSpent ?? current.actualTimeSpent
        data.timeDifference = est != null && act != null ? est - act : null
      }
    }

    const task = await prisma.completedTask.update({
      where: { id },
      data,
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update completed task:', error)
    return NextResponse.json(
      { error: 'Failed to update completed task' },
      { status: 500 }
    )
  }
}
