import { expect, type ApiClient } from './app'

/**
 * API seed helpers. Calls go through the running app, into that test's own
 * temp database. Used to set up state without driving multi-step UI.
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
  api: ApiClient,
  overrides: Partial<{ name: string; color: string; order: number }> = {},
): Promise<SeededCategory> {
  const res = await api.post('/api/categories', {
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
  api: ApiClient,
  categoryId: string,
  overrides: Partial<{ title: string; type: string; dueAt: string | null }> = {},
): Promise<SeededTask> {
  const res = await api.post('/api/tasks', {
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
