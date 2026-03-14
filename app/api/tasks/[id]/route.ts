import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  dueAt: z.string().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  estimatedDuration: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  priorityOrder: z.number().optional(),
  status: z.string().optional(),
  actualTimeSpent: z.number().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const parsed = UpdateTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Convert dueAt string to Date if provided, or set to null
    const { dueAt, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (dueAt !== undefined) {
      data.dueAt = dueAt ? new Date(dueAt) : null
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
