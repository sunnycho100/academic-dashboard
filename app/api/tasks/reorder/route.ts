import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Bulk update priority orders after drag-and-drop reorder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // body.orders: [{ id: string, priorityOrder: number }]

    await prisma.$transaction(
      body.orders.map((item: { id: string; priorityOrder: number }) =>
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
