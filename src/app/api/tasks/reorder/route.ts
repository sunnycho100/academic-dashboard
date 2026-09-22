import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const ReorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().min(1).max(255),
      priorityOrder: z.number().int().min(0),
    })
  ).min(1).max(500),
})

// Bulk update priority orders after drag-and-drop reorder
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = ReorderSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify all tasks belong to the user
    const taskIds = parsed.data.orders.map((item) => item.id)
    const ownedTasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, userId },
      select: { id: true },
    })
    if (ownedTasks.length !== taskIds.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.$transaction(
      parsed.data.orders.map((item) =>
        prisma.task.update({
          where: { id: item.id },
          data: { priorityOrder: item.priorityOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to reorder tasks:', error)
    return NextResponse.json(
      { error: 'Failed to reorder tasks' },
      { status: 500 }
    )
  }
}
