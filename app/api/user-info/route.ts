import { z } from 'zod'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const UpdateUserInfoSchema = z.object({
  name: z.string().min(1).max(100),
})

// GET /api/user-info — returns the user's display name
export async function GET() {
  try {
    const user = await prisma.userInfo.findUnique({
      where: { id: 'default' },
    })
    const fallback = process.env.USER_NAME || 'User'
    return NextResponse.json({ name: user?.name ?? fallback })
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    const fallback = process.env.USER_NAME || 'User'
    return NextResponse.json({ name: fallback })
  }
}

// PUT /api/user-info — update the user's display name
export async function PUT(request: Request) {
  try {
    const parsed = UpdateUserInfoSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { name } = parsed.data
    const user = await prisma.userInfo.upsert({
      where: { id: 'default' },
      update: { name },
      create: { id: 'default', name },
    })
    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to update user info:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
