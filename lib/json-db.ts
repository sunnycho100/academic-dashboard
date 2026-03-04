/**
 * JSON File-based Database — drop-in replacement for Prisma client.
 *
 * Implements the subset of the Prisma client API used by the API routes,
 * backed by flat JSON files in the `data/` directory.
 *
 * Supports: findMany, findUnique, create, update, updateMany,
 *           delete, deleteMany, count, upsert, $transaction
 *
 * Where-clause operators: null, equality, { not, lt, lte, gte, gt }
 * OrderBy: { field: 'asc' | 'desc' }
 * Include: { task: { include: { category: true } } } (weeklyPlanEntry only)
 */

import { readFile, writeFile, mkdir, rename } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// JSON file I/O
// ---------------------------------------------------------------------------

/** Reviver that turns ISO-8601 strings back into Date objects. */
function dateReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return new Date(value)
  }
  return value
}

async function readJsonFile<T>(filename: string): Promise<T[]> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  try {
    const content = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content, dateReviver)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  const tmpPath = filePath + '.tmp'
  await writeFile(tmpPath, JSON.stringify(data, null, 2))
  await rename(tmpPath, filePath)
}

// ---------------------------------------------------------------------------
// Where-clause matching
// ---------------------------------------------------------------------------

function matchesWhere(
  item: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(where)) {
    const value = item[key]

    if (condition === null || condition === undefined) {
      // Expect the value to be null / undefined
      if (value !== null && value !== undefined) return false
    } else if (condition instanceof Date) {
      if (!(value instanceof Date) || value.getTime() !== condition.getTime())
        return false
    } else if (
      typeof condition === 'object' &&
      !Array.isArray(condition)
    ) {
      // Operator object: { not, lt, lte, gte, gt }
      const ops = condition as Record<string, unknown>

      if ('not' in ops) {
        if (ops.not === null) {
          // { not: null } means "field IS NOT NULL"
          if (value === null || value === undefined) return false
        } else {
          if (value === ops.not) return false
        }
      }
      if ('lt' in ops) {
        if (value === null || value === undefined) return false
        const cmp = ops.lt instanceof Date ? ops.lt.getTime() : (ops.lt as number)
        const val = value instanceof Date ? value.getTime() : (value as number)
        if (!(val < cmp)) return false
      }
      if ('lte' in ops) {
        if (value === null || value === undefined) return false
        const cmp = ops.lte instanceof Date ? ops.lte.getTime() : (ops.lte as number)
        const val = value instanceof Date ? value.getTime() : (value as number)
        if (!(val <= cmp)) return false
      }
      if ('gte' in ops) {
        if (value === null || value === undefined) return false
        const cmp = ops.gte instanceof Date ? ops.gte.getTime() : (ops.gte as number)
        const val = value instanceof Date ? value.getTime() : (value as number)
        if (!(val >= cmp)) return false
      }
      if ('gt' in ops) {
        if (value === null || value === undefined) return false
        const cmp = ops.gt instanceof Date ? ops.gt.getTime() : (ops.gt as number)
        const val = value instanceof Date ? value.getTime() : (value as number)
        if (!(val > cmp)) return false
      }
    } else {
      // Simple equality
      if (value instanceof Date && condition instanceof Date) {
        if (value.getTime() !== (condition as Date).getTime()) return false
      } else if (value !== condition) {
        return false
      }
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// OrderBy helper
// ---------------------------------------------------------------------------

function applyOrderBy<T>(
  items: T[],
  orderBy?: Record<string, 'asc' | 'desc'>,
): T[] {
  if (!orderBy) return items
  const entries = Object.entries(orderBy)
  if (entries.length === 0) return items

  const [field, direction] = entries[0]
  return [...items].sort((a: unknown, b: unknown) => {
    const aRec = a as Record<string, unknown>
    const bRec = b as Record<string, unknown>
    const aVal = aRec[field]
    const bVal = bRec[field]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return direction === 'asc' ? -1 : 1
    if (bVal == null) return direction === 'asc' ? 1 : -1

    const aComp = aVal instanceof Date ? aVal.getTime() : aVal
    const bComp = bVal instanceof Date ? bVal.getTime() : bVal

    if ((aComp as number) < (bComp as number)) return direction === 'asc' ? -1 : 1
    if ((aComp as number) > (bComp as number)) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// ---------------------------------------------------------------------------
// Generic JSON-backed Model
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

class JsonModel<T extends { id: string }> {
  constructor(
    protected filename: string,
    protected defaults: Partial<T> = {},
  ) {}

  /** Read all records from disk. */
  async read(): Promise<T[]> {
    return readJsonFile<T>(this.filename)
  }

  /** Persist full record set to disk. */
  protected async save(data: T[]): Promise<void> {
    return writeJsonFile(this.filename, data)
  }

  // ---- Prisma-compatible query methods -----------------------------------

  async findMany(args?: {
    where?: Record<string, any>
    orderBy?: Record<string, 'asc' | 'desc'>
    include?: any
  }): Promise<any[]> {
    let items = await this.read()

    if (args?.where) {
      items = items.filter((item) =>
        matchesWhere(item as unknown as Record<string, unknown>, args.where!),
      )
    }

    if (args?.orderBy) {
      items = applyOrderBy(items, args.orderBy)
    }

    return items
  }

  async findUnique(args: {
    where: Record<string, any>
  }): Promise<T | null> {
    const items = await this.read()
    return (
      items.find((item) => {
        for (const [key, value] of Object.entries(args.where)) {
          if ((item as any)[key] !== value) return false
        }
        return true
      }) ?? null
    )
  }

  async create(args: { data: any; include?: any }): Promise<any> {
    const items = await this.read()
    const now = new Date()
    const newItem = {
      id: randomUUID(),
      ...this.defaults,
      ...args.data,
      createdAt: args.data.createdAt ?? now,
      updatedAt: now,
    } as T
    items.push(newItem)
    await this.save(items)
    return newItem
  }

  async update(args: {
    where: { id: string }
    data: any
  }): Promise<T> {
    const items = await this.read()
    const index = items.findIndex((item) => item.id === args.where.id)
    if (index === -1) throw new Error(`Record not found: ${args.where.id}`)

    const updated = {
      ...items[index],
      ...args.data,
      updatedAt: new Date(),
    }
    items[index] = updated
    await this.save(items)
    return updated
  }

  async updateMany(args: {
    where: Record<string, any>
    data: Record<string, any>
  }): Promise<{ count: number }> {
    const items = await this.read()
    let count = 0
    const updated = items.map((item) => {
      if (
        matchesWhere(item as unknown as Record<string, unknown>, args.where)
      ) {
        count++
        return { ...item, ...args.data, updatedAt: new Date() }
      }
      return item
    })
    if (count > 0) await this.save(updated)
    return { count }
  }

  async delete(args: { where: { id: string } }): Promise<T> {
    const items = await this.read()
    const index = items.findIndex((item) => item.id === args.where.id)
    if (index === -1) throw new Error(`Record not found: ${args.where.id}`)
    const deleted = items[index]
    items.splice(index, 1)
    await this.save(items)
    return deleted
  }

  async deleteMany(args?: {
    where?: Record<string, any>
  }): Promise<{ count: number }> {
    if (!args?.where) {
      const items = await this.read()
      const count = items.length
      await this.save([])
      return { count }
    }

    const items = await this.read()
    const remaining = items.filter(
      (item) =>
        !matchesWhere(
          item as unknown as Record<string, unknown>,
          args.where!,
        ),
    )
    const count = items.length - remaining.length
    if (count > 0) await this.save(remaining)
    return { count }
  }

  async count(args?: {
    where?: Record<string, any>
  }): Promise<number> {
    const items = await this.read()
    if (!args?.where) return items.length
    return items.filter((item) =>
      matchesWhere(item as unknown as Record<string, unknown>, args.where!),
    ).length
  }

  async upsert(args: {
    where: Record<string, any>
    update: any
    create: any
  }): Promise<T> {
    const existing = await this.findUnique({ where: args.where })
    if (existing) {
      return this.update({ where: { id: existing.id }, data: args.update })
    }
    return this.create({ data: args.create })
  }
}

// ---------------------------------------------------------------------------
// WeeklyPlanEntry Model — include support for task → category joins
// ---------------------------------------------------------------------------

class WeeklyPlanModel extends JsonModel<any> {
  constructor() {
    super('weekly-plan.json')
  }

  /** Manually resolve { task: { include: { category: true } } } */
  private async resolveIncludes(
    entry: any,
    include?: any,
  ): Promise<any> {
    if (!include?.task) return entry

    const tasks = await readJsonFile<any>('tasks.json')
    const task = tasks.find((t: any) => t.id === entry.taskId) ?? null

    if (task && include.task?.include?.category) {
      const categories = await readJsonFile<any>('categories.json')
      task.category =
        categories.find((c: any) => c.id === task.categoryId) ?? null
    }

    return { ...entry, task }
  }

  async findMany(args?: any): Promise<any[]> {
    const items = await super.findMany(args)

    if (args?.include) {
      return Promise.all(
        items.map((item: any) =>
          this.resolveIncludes(item, args.include),
        ),
      )
    }

    return items
  }

  async create(args: any): Promise<any> {
    // Enforce @@unique([taskId, date]) constraint
    const items = await this.read()
    const newDate =
      args.data.date instanceof Date
        ? args.data.date.toISOString().split('T')[0]
        : String(args.data.date).split('T')[0]

    const duplicate = items.find((item: any) => {
      const itemDate =
        item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : String(item.date).split('T')[0]
      return item.taskId === args.data.taskId && itemDate === newDate
    })

    if (duplicate) {
      const error: any = new Error('Unique constraint violation')
      error.code = 'P2002'
      throw error
    }

    const created = await super.create(args)

    if (args.include) {
      return this.resolveIncludes(created, args.include)
    }

    return created
  }
}

// ---------------------------------------------------------------------------
// JSON Database — top-level class mirroring the PrismaClient surface
// ---------------------------------------------------------------------------

class JsonDatabase {
  category = new JsonModel<any>('categories.json')
  task = new JsonModel<any>('tasks.json')
  completedTask = new JsonModel<any>('completed-tasks.json')
  timeRecord = new JsonModel<any>('time-records.json')
  weeklyPlanEntry = new WeeklyPlanModel()
  userInfo = new JsonModel<any>('user-info.json')

  /**
   * $transaction — accepts an array of already-executing promises.
   * In JSON mode there are no real transaction semantics; we simply
   * await everything and return results in order.
   */
  async $transaction(operations: Promise<any>[]): Promise<any[]> {
    return Promise.all(operations)
  }

  /** No-op for API compatibility with Prisma. */
  async $disconnect(): Promise<void> {
    // nothing to disconnect
  }
}

// ---------------------------------------------------------------------------
// Singleton (prevents multiple instances during hot-reload)
// ---------------------------------------------------------------------------

const globalForJsonDb = globalThis as unknown as { jsonDb?: JsonDatabase }

export const jsonDb =
  globalForJsonDb.jsonDb ?? new JsonDatabase()

if (process.env.NODE_ENV !== 'production') {
  globalForJsonDb.jsonDb = jsonDb
}
