import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

export async function DELETE() {

  try {
    const userId = await getAuthenticatedUser()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const result = await prisma.completedTask.deleteMany({
      where: {
        userId,
        deletedAt: {
          not: null,
          lt: threeDaysAgo,
        },
      },
    })

    return Response.json({
      message: `Cleaned up ${result.count} permanently deleted tasks`,
      count: result.count,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to cleanup deleted tasks:', error)
    return Response.json(
      { error: 'Failed to cleanup deleted tasks' },
      { status: 500 }
    )
  }
}
