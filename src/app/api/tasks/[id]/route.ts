import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: z.string().min(1).max(100).optional(),
  dueAt: z.string().max(50).nullable().optional(),
  categoryId: z.string().min(1).max(255).optional(),
  estimatedDuration: z.number().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  priorityOrder: z.number().int().min(0).optional(),
  status: z.string().max(50).optional(),
  actualTimeSpent: z.number().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params
    const parsed = UpdateTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
    if (error instanceof Response) return error
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
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
