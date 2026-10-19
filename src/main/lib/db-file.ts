import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

// ponytail: PRAGMA user_version counts applied migrations. Never edit an old
// migration; add a new folder with `pnpm db:migrate` instead.
export function migrate(dbPath: string, migrations: string[]) {
  const db = new Database(dbPath)
  try {
    const applied = db.pragma('user_version', { simple: true }) as number
    if (applied >= migrations.length) return

    // Keep the pre-migration state; VACUUM INTO is a consistent copy even with a WAL file.
    const copy = dbPath.replace(/\.db$/, '') + `.pre-migrate-${applied}.db`
    if (applied > 0 && !fs.existsSync(copy)) db.prepare('VACUUM INTO ?').run(copy)

    // foreign_keys can only change outside a transaction. With it on, the DROP TABLE
    // in a Prisma table rebuild cascade-deletes every child row, so turn it off here
    // and check the constraints ourselves before each migration commits.
    db.pragma('foreign_keys = OFF')
    for (let i = applied; i < migrations.length; i++) {
      db.transaction(() => {
        db.exec(migrations[i])
        const violations = db.pragma('foreign_key_check') as unknown[]
        if (violations.length) {
          throw new Error(`Migration ${i + 1} left ${violations.length} foreign key violations`)
        }
        db.pragma(`user_version = ${i + 1}`)
      })()
    }
    db.pragma('foreign_keys = ON')
  } finally {
    db.close()
  }
}

/** One copy of the database per local day in `dir` (e.g. academic-dashboard-2026-10-11.db), last `keep` kept. */
export async function dailyBackup(dbPath: string, dir: string, now = new Date(), keep = 7) {
  const name = path.basename(dbPath, '.db')
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  fs.mkdirSync(dir, { recursive: true })
  const target = path.join(dir, `${name}-${day}.db`)
  if (!fs.existsSync(target)) {
    const db = new Database(dbPath, { readonly: true })
    try {
      await db.backup(target)
    } finally {
      db.close()
    }
  }
  const pattern = new RegExp(`^${name}-\\d{4}-\\d{2}-\\d{2}\\.db$`)
  const old = fs.readdirSync(dir).filter((f) => pattern.test(f)).sort().slice(0, -keep)
  for (const f of old) fs.rmSync(path.join(dir, f))
}
