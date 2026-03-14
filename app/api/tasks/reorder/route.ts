import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

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
    const parsed = ReorderSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
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
    console.error('Failed to reorder tasks:', error)
    return NextResponse.json(
      { error: 'Failed to reorder tasks' },
      { status: 500 }
    )
  }
}
