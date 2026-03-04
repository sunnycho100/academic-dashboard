/**
 * migrate-db-to-json.ts
 *
 * Exports all data from the PostgreSQL database into JSON files
 * in the data/ directory. Run this once to migrate from Database Mode
 * to JSON Mode while keeping your existing data.
 *
 * Usage:
 *   npx tsx scripts/migrate-db-to-json.ts
 *
 * Prerequisites:
 *   - Docker + PostgreSQL must be running
 *   - DATABASE_URL must be set in .env
 */

import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

async function migrate() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('✗ DATABASE_URL is not set in .env')
    process.exit(1)
  }

  console.log('Connecting to PostgreSQL...')
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  console.log('Reading data from PostgreSQL...\n')

  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
  const tasks = await prisma.task.findMany({ orderBy: { priorityOrder: 'asc' } })
  const completedTasks = await prisma.completedTask.findMany({
    orderBy: { completedAt: 'desc' },
  })
  const timeRecords = await prisma.timeRecord.findMany({
    orderBy: { startTime: 'asc' },
  })
  const weeklyPlan = await prisma.weeklyPlanEntry.findMany({
    orderBy: { createdAt: 'asc' },
  })
  const userInfo = await prisma.userInfo.findUnique({
    where: { id: 'default' },
  })

  console.log(`  Categories:        ${categories.length}`)
  console.log(`  Tasks:             ${tasks.length}`)
  console.log(`  Completed Tasks:   ${completedTasks.length}`)
  console.log(`  Time Records:      ${timeRecords.length}`)
  console.log(`  Weekly Plan:       ${weeklyPlan.length}`)
  console.log(`  User Info:         ${userInfo ? 'found' : 'none'}`)

  const write = (file: string, data: unknown) =>
    writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2))

  write('categories.json', categories)
  write('tasks.json', tasks)
  write('completed-tasks.json', completedTasks)
  write('time-records.json', timeRecords)
  write('weekly-plan.json', weeklyPlan)
  write(
    'user-info.json',
    userInfo ?? { id: 'default', name: process.env.USER_NAME || 'User', createdAt: new Date(), updatedAt: new Date() },
  )

  console.log('\n✓ All data exported to data/ directory')
  console.log('')
  console.log('You can now run in JSON mode:')
  console.log('  ./start.sh')
  console.log('')

  await prisma.$disconnect()
  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
