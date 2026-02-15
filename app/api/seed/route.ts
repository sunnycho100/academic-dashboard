import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Seed the database from localStorage data (one-time migration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories, tasks } = body

    if (!categories?.length && !tasks?.length) {
      return NextResponse.json({ seeded: false, message: 'No data to seed' })
    }

    // Check if DB already has data
    const existingCategories = await prisma.category.count()
    if (existingCategories > 0) {
      return NextResponse.json({ seeded: false, message: 'Database already has data' })
    }

    // Create categories and build ID map
    const categoryIdMap: Record<string, string> = {}
    for (const cat of categories) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          color: cat.color,
          order: cat.order ?? 0,
        },
      })
      categoryIdMap[cat.id] = created.id
    }

    // Create tasks with mapped category IDs
    for (const task of tasks) {
      const newCategoryId = categoryIdMap[task.categoryId]
      if (!newCategoryId) continue // skip tasks with invalid category
      await prisma.task.create({
        data: {
          title: task.title,
          type: task.type,
          dueAt: new Date(task.dueAt),
          status: task.status ?? 'todo',
          priorityOrder: task.priorityOrder ?? 0,
          notes: task.notes ?? null,
          estimatedDuration: task.estimatedDuration ?? null,
          actualTimeSpent: task.actualTimeSpent ?? null,
          categoryId: newCategoryId,
        },
      })
    }

    // Return the new state
    const newCategories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
    const newTasks = await prisma.task.findMany({ orderBy: { priorityOrder: 'asc' } })

    return NextResponse.json({
      seeded: true,
      categories: newCategories,
      tasks: newTasks,
      categoryIdMap,
    })
  } catch (error) {
    console.error('Seed operation failed:', error)
    return NextResponse.json(
      { error: 'Seed operation failed' },
      { status: 500 }
    )
  }
}
