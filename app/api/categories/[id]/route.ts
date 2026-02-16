import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

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
