import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { priorityOrder: 'asc' },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const task = await prisma.task.create({
      data: {
        title: body.title,
        type: body.type,
        dueAt: new Date(body.dueAt),
        status: body.status ?? 'todo',
        priorityOrder: body.priorityOrder ?? 0,
        notes: body.notes ?? null,
        estimatedDuration: body.estimatedDuration ?? null,
        actualTimeSpent: body.actualTimeSpent ?? null,
        categoryId: body.categoryId,
      },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
