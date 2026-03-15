import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
})

export async function GET() {
  try {
    const userId = await getAuthenticatedUser()
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateCategorySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data
    const category = await prisma.category.create({
      data: {
        name: body.name,
        color: body.color,
        order: body.order ?? 0,
        userId,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to create category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
