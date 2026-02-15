import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Bulk operations: clear all or import data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, categories, tasks } = body

    if (action === 'clear') {
      // Delete all tasks first (FK constraint), then categories
      await prisma.task.deleteMany()
      await prisma.category.deleteMany()
      return NextResponse.json({ success: true })
    }

    if (action === 'import') {
      // Clear existing data first
      await prisma.task.deleteMany()
      await prisma.category.deleteMany()

      // Create categories
      const createdCategories = await Promise.all(
        (categories ?? []).map((cat: { name: string; color: string; order: number }) =>
          prisma.category.create({
            data: {
              name: cat.name,
              color: cat.color,
              order: cat.order ?? 0,
            },
          })
        )
      )

      // Map old category IDs to new ones
      const categoryIdMap: Record<string, string> = {}
      ;(categories ?? []).forEach(
        (oldCat: { id: string }, index: number) => {
          categoryIdMap[oldCat.id] = createdCategories[index].id
        }
      )

      // Create tasks with mapped category IDs
      await Promise.all(
        (tasks ?? []).map(
          (task: {
            title: string
            type: string
            dueAt: string
            status: string
            priorityOrder: number
            notes?: string
            estimatedDuration?: number
            actualTimeSpent?: number
            categoryId: string
          }) =>
            prisma.task.create({
              data: {
                title: task.title,
                type: task.type,
                dueAt: new Date(task.dueAt),
                status: task.status ?? 'todo',
                priorityOrder: task.priorityOrder ?? 0,
                notes: task.notes ?? null,
                estimatedDuration: task.estimatedDuration ?? null,
                actualTimeSpent: task.actualTimeSpent ?? null,
                categoryId: categoryIdMap[task.categoryId] ?? task.categoryId,
              },
            })
        )
      )

      // Fetch and return the new state
      const newCategories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
      const newTasks = await prisma.task.findMany({ orderBy: { priorityOrder: 'asc' } })
      return NextResponse.json({ categories: newCategories, tasks: newTasks })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Bulk operation failed:', error)
    return NextResponse.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    )
  }
}
