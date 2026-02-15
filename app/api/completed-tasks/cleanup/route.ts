import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const result = await prisma.completedTask.deleteMany({
      where: {
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
    console.error('Failed to cleanup deleted tasks:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup deleted tasks' },
      { status: 500 }
    )
  }
}
