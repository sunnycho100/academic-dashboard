import { app } from 'electron'
import path from 'node:path'
import Database from 'better-sqlite3'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/prisma/client'

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

// ponytail: PRAGMA user_version counts applied migrations. Never edit an old
// migration; add a new folder with `pnpm db:migrate` instead.
function migrate() {
  const db = new Database(dbPath)
  try {
    db.pragma('foreign_keys = ON')
    const applied = db.pragma('user_version', { simple: true }) as number
    for (let i = applied; i < migrations.length; i++) {
      db.transaction(() => {
        db.exec(migrations[i][1])
        db.pragma(`user_version = ${i + 1}`)
      })()
    }
  } finally {
    db.close()
  }
}

migrate()

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
})
