import { type APIRequestContext, expect } from '@playwright/test'

/**
 * Authenticated API seed helpers. In the `authed` project the request context
 * inherits storageState, so these calls are authenticated as the test user and
 * scoped to their userId. Used to set up deterministic state without driving
 * multi-step UI for every precondition.
 */

export interface SeededCategory {
  id: string
  name: string
  color: string
  order: number
}

export interface SeededTask {
  id: string
  title: string
  type: string
  categoryId: string
  dueAt: string | null
  status: string
}

export async function seedCategory(
  request: APIRequestContext,
  overrides: Partial<{ name: string; color: string; order: number }> = {},
): Promise<SeededCategory> {
  const res = await request.post('/api/categories', {
    data: {
      name: overrides.name ?? 'TEST CS101',
      color: overrides.color ?? 'hsl(110, 70%, 50%)',
      order: overrides.order ?? 0,
    },
  })
  expect(res.ok(), `seedCategory failed: ${res.status()}`).toBeTruthy()
  return res.json()
}

export async function seedTask(
  request: APIRequestContext,
  categoryId: string,
  overrides: Partial<{ title: string; type: string; dueAt: string | null }> = {},
): Promise<SeededTask> {
  const res = await request.post('/api/tasks', {
    data: {
      title: overrides.title ?? 'Watch Lecture 12',
      type: overrides.type ?? 'lecture',
      categoryId,
      dueAt: overrides.dueAt ?? null,
    },
  })
  expect(res.ok(), `seedTask failed: ${res.status()}`).toBeTruthy()
  return res.json()
}
