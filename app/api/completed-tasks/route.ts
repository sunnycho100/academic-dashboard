import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tasks = await prisma.completedTask.findMany({
      where: { deletedAt: null },
      orderBy: { completedAt: 'desc' },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch completed tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const timeDifference =
      body.estimatedDuration != null && body.actualTimeSpent != null
        ? body.estimatedDuration - body.actualTimeSpent
        : null

    const task = await prisma.completedTask.create({
      data: {
        taskTitle: body.taskTitle,
        categoryName: body.categoryName,
        categoryColor: body.categoryColor,
        taskType: body.taskType,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        actualTimeSpent: body.actualTimeSpent ?? null,
        estimatedDuration: body.estimatedDuration ?? null,
        timeDifference,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create completed task:', error)
    return NextResponse.json(
      { error: 'Failed to create completed task' },
      { status: 500 }
    )
  }
}
