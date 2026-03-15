import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params
    const parsed = UpdateCategorySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // If renaming, also cascade to CompletedTask and TimeRecord
    if (body.name && existing.name !== body.name) {
      await Promise.all([
        prisma.completedTask.updateMany({
          where: { categoryName: existing.name, userId },
          data: { categoryName: body.name },
        }),
        prisma.timeRecord.updateMany({
          where: { categoryName: existing.name, userId },
          data: { categoryName: body.name },
        }),
      ])
    }

    const category = await prisma.category.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to update category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
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

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
