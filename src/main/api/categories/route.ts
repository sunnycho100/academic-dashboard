import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

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
    return Response.json(categories)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to fetch categories:', error)
    return Response.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = CreateCategorySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
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
    return Response.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to create category:', error)
    return Response.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
