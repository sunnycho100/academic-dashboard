export interface TimeRecordInput {
  taskId: string | null
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
  startTime: string
  endTime: string
  /** seconds */
  duration: number
}

/** A segment ends this long after its last tick at most; older means the app was closed. */
export const STALE_TICK_MS = 2 * 60_000

/**
 * POST a finished timer segment. A non-2xx answer counts as a failure too; it is retried
 * once, which is safe because the server stores a segment once per start time.
 */
export async function saveTimeRecord(record: TimeRecordInput) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('/api/time-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (res.ok) return
      console.error(`Failed to save time record (HTTP ${res.status}), attempt ${attempt}`)
    } catch (err) {
      console.error(`Failed to save time record, attempt ${attempt}:`, err)
    }
  }
}
