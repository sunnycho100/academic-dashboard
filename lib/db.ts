/**
 * Storage abstraction layer.
 *
 * Exports `prisma` — which is either the real PrismaClient (postgres mode)
 * or the JSON file-backed database (json mode), depending on the
 * STORAGE_MODE environment variable.
 *
 *   STORAGE_MODE=json      →  flat JSON files in data/   (default)
 *   STORAGE_MODE=postgres   →  PostgreSQL via Prisma + Docker
 *
 * All API routes import { prisma } from '@/lib/db' and work identically
 * regardless of which backend is active.
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

const storageMode = process.env.STORAGE_MODE || 'json'

let _db: any

if (storageMode === 'postgres') {
  try {
    const { prisma: p } = require('./prisma')
    _db = p
  } catch (error) {
    console.error(
      '⚠ Failed to initialise Prisma client. Falling back to JSON storage mode.',
      error,
    )
    const { jsonDb } = require('./json-db')
    _db = jsonDb
  }
} else {
  const { jsonDb } = require('./json-db')
  _db = jsonDb
}

export const prisma: any = _db
