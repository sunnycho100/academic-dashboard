import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const BulkCategorySchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
})

const BulkTaskSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  dueAt: z.string().min(1),
  status: z.string().max(50).optional(),
  priorityOrder: z.number().int().min(0).optional(),
  notes: z.string().max(5000).nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  actualTimeSpent: z.number().nullable().optional(),
  categoryId: z.string().min(1).max(255),
})

const BulkActionSchema = z.object({
  action: z.enum(['clear', 'import']),
  categories: z.array(BulkCategorySchema).optional(),
  tasks: z.array(BulkTaskSchema).optional(),
})

// Bulk operations: clear all or import data
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const parsed = BulkActionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { action, categories, tasks } = parsed.data

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
        (categories ?? []).map((cat) =>
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
        (oldCat, index) => {
          categoryIdMap[oldCat.id] = createdCategories[index].id
        }
      )

      // Create tasks with mapped category IDs
      await Promise.all(
        (tasks ?? []).map(
          (task) =>
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
