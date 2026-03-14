import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  order: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const parsed = UpdateCategorySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    // If renaming, also cascade to CompletedTask and TimeRecord
    if (body.name) {
      const existing = await prisma.category.findUnique({ where: { id } })
      if (existing && existing.name !== body.name) {
        await Promise.all([
          prisma.completedTask.updateMany({
            where: { categoryName: existing.name },
            data: { categoryName: body.name },
          }),
          prisma.timeRecord.updateMany({
            where: { categoryName: existing.name },
            data: { categoryName: body.name },
          }),
        ])
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(category)
  } catch (error) {
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
    const { id } = await params
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
