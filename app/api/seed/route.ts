import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const SeedCategorySchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
})

const SeedTaskSchema = z.object({
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

const SeedSchema = z.object({
  categories: z.array(SeedCategorySchema).default([]),
  tasks: z.array(SeedTaskSchema).default([]),
})

// Seed the database from localStorage data (one-time migration)
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const parsed = SeedSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { categories, tasks } = parsed.data

    if (!categories.length && !tasks.length) {
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
