import { z } from 'zod'
import { prisma } from '@main/lib/db'
import { getAuthenticatedUser } from '@main/lib/auth'

// Ids are kept on import so links between tables (task -> course, time record -> task,
// plan entry -> task) still hold. Missing ids get fresh ones.
const id = z.string().min(1).max(255)
const date = z.coerce.date()
const maybeDate = z.coerce.date().nullable().optional()
const maybeInt = z.number().int().nullable().optional()

const CategorySchema = z.object({
  id,
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(100),
  order: z.number().int().optional(),
  createdAt: date.optional(),
})

const TaskSchema = z.object({
  id: id.optional(),
  title: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  dueAt: maybeDate,
  status: z.string().max(50).optional(),
  priorityOrder: z.number().int().optional(),
  notes: z.string().max(5000).nullable().optional(),
  estimatedDuration: maybeInt,
  actualTimeSpent: maybeInt,
  categoryId: id,
  createdAt: date.optional(),
})

const CompletedTaskSchema = z.object({
  id: id.optional(),
  taskTitle: z.string().min(1).max(255),
  categoryName: z.string().min(1).max(255),
  categoryColor: z.string().min(1).max(100),
  taskType: z.string().min(1).max(100),
  dueAt: maybeDate,
  completedAt: date.optional(),
  actualTimeSpent: maybeInt,
  estimatedDuration: maybeInt,
  timeDifference: maybeInt,
  notes: z.string().max(5000).nullable().optional(),
  deletedAt: maybeDate,
  createdAt: date.optional(),
})

const TimeRecordSchema = z.object({
  id: id.optional(),
  taskId: id.nullable().optional(),
  taskTitle: z.string().min(1).max(255),
  categoryName: z.string().min(1).max(255),
  categoryColor: z.string().min(1).max(100),
  taskType: z.string().min(1).max(100),
  startTime: date,
  endTime: date,
  duration: z.number().int(),
  createdAt: date.optional(),
})

const TimetableEntrySchema = z.object({
  id: id.optional(),
  date: z.string().min(1).max(50),
  order: z.number().int().optional(),
  plannedStart: z.string().max(20),
  plannedEnd: z.string().max(20),
  expectedMinutes: z.number().int(),
  activityName: z.string().max(255),
  actualStart: z.string().max(20).nullable().optional(),
  actualEnd: z.string().max(20).nullable().optional(),
  actualMinutes: maybeInt,
  notes: z.string().max(5000).optional(),
  createdAt: date.optional(),
})

const WeeklyPlanEntrySchema = z.object({
  id: id.optional(),
  taskId: id,
  date,
  createdAt: date.optional(),
})

// Old exports only had categories and tasks; a table missing from the file is left as is.
const BulkActionSchema = z.object({
  action: z.enum(['clear', 'import']),
  categories: z.array(CategorySchema).optional(),
  tasks: z.array(TaskSchema).optional(),
  completedTasks: z.array(CompletedTaskSchema).optional(),
  timeRecords: z.array(TimeRecordSchema).optional(),
  timetableEntries: z.array(TimetableEntrySchema).optional(),
  weeklyPlanEntries: z.array(WeeklyPlanEntrySchema).optional(),
  userInfo: z.object({ name: z.string().min(1).max(100) }).nullable().optional(),
})

// Full export: every table for this user.
export async function GET() {
  try {
    const userId = await getAuthenticatedUser()
    const where = { userId }
    const [categories, tasks, completedTasks, timeRecords, timetableEntries, weeklyPlanEntries, userInfo] =
      await prisma.$transaction([
        prisma.category.findMany({ where, orderBy: { order: 'asc' } }),
        prisma.task.findMany({ where, orderBy: { priorityOrder: 'asc' } }),
        prisma.completedTask.findMany({ where, orderBy: { completedAt: 'asc' } }),
        prisma.timeRecord.findMany({ where, orderBy: { startTime: 'asc' } }),
        prisma.timetableEntry.findMany({ where, orderBy: [{ date: 'asc' }, { order: 'asc' }] }),
        prisma.weeklyPlanEntry.findMany({ where, orderBy: { date: 'asc' } }),
        prisma.userInfo.findUnique({ where }),
      ])
    return Response.json({
      version: 2,
      exportedAt: new Date().toISOString(),
      categories,
      tasks,
      completedTasks,
      timeRecords,
      timetableEntries,
      weeklyPlanEntries,
      userInfo,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Export failed:', error)
    return Response.json({ error: 'Export failed' }, { status: 500 })
  }
}

// Bulk operations: clear all or import data
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUser()
    const parsed = BulkActionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { action, categories, tasks, completedTasks, timeRecords, timetableEntries, weeklyPlanEntries, userInfo } =
      parsed.data
    const where = { userId }

    if (action === 'clear') {
      // Delete all tasks first (FK constraint), then categories — scoped to user
      await prisma.task.deleteMany({ where })
      await prisma.category.deleteMany({ where })
      return Response.json({ success: true })
    }

    // One transaction: if any row fails, nothing is deleted or written.
    const withUser = <T,>(rows: T[] | undefined) => (rows ?? []).map((r) => ({ ...r, userId }))
    const replaceCourses = categories !== undefined || tasks !== undefined
    await prisma.$transaction([
      ...(weeklyPlanEntries !== undefined || replaceCourses ? [prisma.weeklyPlanEntry.deleteMany({ where })] : []),
      ...(replaceCourses ? [prisma.task.deleteMany({ where }), prisma.category.deleteMany({ where })] : []),
      ...(completedTasks !== undefined ? [prisma.completedTask.deleteMany({ where })] : []),
      ...(timeRecords !== undefined ? [prisma.timeRecord.deleteMany({ where })] : []),
      ...(timetableEntries !== undefined ? [prisma.timetableEntry.deleteMany({ where })] : []),
      ...(userInfo !== undefined ? [prisma.userInfo.deleteMany({ where })] : []),

      prisma.category.createMany({ data: withUser(categories) }),
      prisma.task.createMany({ data: withUser(tasks) }),
      prisma.weeklyPlanEntry.createMany({ data: withUser(weeklyPlanEntries) }),
      prisma.completedTask.createMany({ data: withUser(completedTasks) }),
      prisma.timeRecord.createMany({ data: withUser(timeRecords) }),
      prisma.timetableEntry.createMany({ data: withUser(timetableEntries) }),
      ...(userInfo ? [prisma.userInfo.create({ data: { userId, name: userInfo.name } })] : []),
    ])

    const newCategories = await prisma.category.findMany({ where, orderBy: { order: 'asc' } })
    const newTasks = await prisma.task.findMany({ where, orderBy: { priorityOrder: 'asc' } })
    return Response.json({ categories: newCategories, tasks: newTasks })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bulk operation failed:', error)
    return Response.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    )
  }
}
