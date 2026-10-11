import { app } from 'electron'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/prisma/client'
import { migrate } from './db-file'

// Migration SQL is bundled at build time, in folder-name (timestamp) order.
const migrations = Object.entries(
  import.meta.glob('../../../prisma/migrations/*/migration.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
).sort(([a], [b]) => a.localeCompare(b))

export const dbPath = path.join(
  app.getPath('userData'),
  // Dev runs get their own file so iterating never touches real data.
  app.isPackaged ? 'academic-dashboard.db' : 'academic-dashboard-dev.db',
)

migrate(dbPath, migrations.map(([, sql]) => sql))

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
})
