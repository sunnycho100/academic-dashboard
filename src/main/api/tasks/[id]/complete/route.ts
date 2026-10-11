import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

/**
 * Complete a task: archive it as a CompletedTask and delete it in one transaction, so a
 * reload never sees it in both places or in neither. The time spent comes from its saved
 * time records, not from the client.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const completed = await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id }, include: { category: true } })
      if (!task || task.userId !== userId) return null
      const { _sum } = await tx.timeRecord.aggregate({ where: { userId, taskId: id }, _sum: { duration: true } })
      const recordedMinutes = Math.round((_sum.duration ?? 0) / 60)
      // A task put back from Done today carries the time it had then (its earlier records
      // belong to the old task id), so that is added on top.
      const actualTimeSpent =
        _sum.duration == null && task.actualTimeSpent == null ? null : recordedMinutes + (task.actualTimeSpent ?? 0)
      const done = await tx.completedTask.create({
        data: {
          userId,
          taskTitle: task.title,
          categoryName: task.category.name,
          categoryColor: task.category.color,
          taskType: task.type,
          dueAt: task.dueAt,
          actualTimeSpent,
          estimatedDuration: task.estimatedDuration,
          timeDifference:
            task.estimatedDuration != null && actualTimeSpent != null ? task.estimatedDuration - actualTimeSpent : null,
          notes: task.notes,
        },
      })
      await tx.task.delete({ where: { id } })
      return done
    })

    if (!completed) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(completed, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to complete task:', error)
    return Response.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
