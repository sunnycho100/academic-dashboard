import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cleanup endpoint disabled in production' },
      { status: 403 }
    )
  }

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

    return NextResponse.json({
      message: `Cleaned up ${result.count} permanently deleted tasks`,
      count: result.count,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to cleanup deleted tasks:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup deleted tasks' },
      { status: 500 }
    )
  }
}
