import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
    const { name } = await request.json()
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
