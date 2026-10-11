// Runs under Electron's Node (see the `test` script): better-sqlite3 is built for Electron.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { dailyBackup, migrate } from './db-file.ts'

const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ad-db-test-')), 'academic-dashboard.db')

const init = `
CREATE TABLE "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE TABLE "Task" ("id" TEXT NOT NULL PRIMARY KEY, "categoryId" TEXT NOT NULL,
  CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
`
// What `prisma migrate dev` generates when a column changes on a parent table.
const rebuildCategory = `
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '');
INSERT INTO "new_Category" ("id", "name") SELECT "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
`
const seed = (file: string) => {
  const db = new Database(file)
  db.exec(`INSERT INTO "Category" VALUES ('c1', 'CS'); INSERT INTO "Task" VALUES ('t1', 'c1');`)
  db.close()
}
const count = (file: string, table: string) => {
  const db = new Database(file, { readonly: true })
  try {
    return (db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n
  } finally {
    db.close()
  }
}

test('a table-rebuild migration keeps the child rows', () => {
  const file = tmpDb()
  migrate(file, [init])
  seed(file)
  migrate(file, [init, rebuildCategory])
  assert.equal(count(file, 'Task'), 1)
  assert.equal(count(file, 'Category'), 1)
})

test('a migration that leaves foreign key violations is rolled back', () => {
  const file = tmpDb()
  migrate(file, [init])
  seed(file)
  const orphan = `INSERT INTO "Task" VALUES ('t2', 'missing');`
  assert.throws(() => migrate(file, [init, orphan]), /foreign key/i)
  assert.equal(count(file, 'Task'), 1)
  const db = new Database(file, { readonly: true })
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  db.close()
})

test('pending migrations first copy the database next to it', () => {
  const file = tmpDb()
  migrate(file, [init])
  seed(file)
  migrate(file, [init, rebuildCategory])
  const copy = path.join(path.dirname(file), 'academic-dashboard.pre-migrate-1.db')
  assert.equal(count(copy, 'Task'), 1)
  assert.equal(count(copy, 'Category'), 1)
})

test('daily backup keeps one copy per day and only the last 7', async () => {
  const file = tmpDb()
  migrate(file, [init])
  seed(file)
  const dir = path.join(path.dirname(file), 'backups')
  for (let day = 1; day <= 9; day++) await dailyBackup(file, dir, new Date(2026, 9, day, 12))
  await dailyBackup(file, dir, new Date(2026, 9, 9, 18))
  const files = fs.readdirSync(dir).sort()
  assert.equal(files.length, 7)
  assert.equal(files[0], 'academic-dashboard-2026-10-03.db')
  assert.equal(files[6], 'academic-dashboard-2026-10-09.db')
  assert.equal(count(path.join(dir, files[6]), 'Task'), 1)
})

test('the app migrations merge duplicate time records and then forbid them', () => {
  const dir = path.resolve(import.meta.dirname, '../../../prisma/migrations')
  const all = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'migration.sql'))).sort()
  const sql = all.map((d) => fs.readFileSync(path.join(dir, d, 'migration.sql'), 'utf8'))
  const file = tmpDb()
  migrate(file, sql.slice(0, 1))
  const row = (id: string, title: string, end: string, duration: number) =>
    `INSERT INTO "TimeRecord" ("id", "userId", "taskTitle", "categoryName", "categoryColor", "taskType", "startTime", "endTime", "duration")
     VALUES ('${id}', 'local', '${title}', 'ECE 555', '#000', 'Lecture', '2026-10-09T02:55:50.333+00:00', '${end}', ${duration});`
  const db = new Database(file)
  db.exec(row('short', 'S4', '2026-10-09T05:00:43.742+00:00', 7493))
  db.exec(row('long', 'S4', '2026-10-09T05:11:34.912+00:00', 8145))
  db.exec(row('other', 'S5', '2026-10-09T05:11:34.912+00:00', 1))
  db.close()

  migrate(file, sql)
  const after = new Database(file)
  assert.deepEqual(after.prepare(`SELECT "id" FROM "TimeRecord" ORDER BY "id"`).pluck().all(), ['long', 'other'])
  assert.throws(() => after.exec(row('again', 'S4', '2026-10-09T05:20:00.000+00:00', 1)), /UNIQUE/)
  after.close()
})
