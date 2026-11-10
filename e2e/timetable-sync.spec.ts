import { test, expect } from './support/app'

const date = '2026-11-10'
const row = (actualStart: string | null, actualEnd: string | null) => ({
  order: 0, plannedStart: '14:25', plannedEnd: '15:09', expectedMinutes: 44, activityName: '9-1 gatekeeper task',
  actualStart, actualEnd, actualMinutes: null, notes: '',
})
const records = async (api: import('./support/app').ApiClient) =>
  (await (await api.get(`/api/time-records?taskIds=timetable:${date}`)).json()) as { taskTitle: string; duration: number; startTime: string; endTime: string }[]

test("a timetable row's actual times keep one time record in step", async ({ api }) => {
  // An in-between value while typing (12:00 reads as past midnight), then the real end
  await api.put('/api/timetable', { data: { date, entries: [row('14:25', '12:00')] } })
  await api.put('/api/timetable', { data: { date, entries: [row('14:25', '15:07')] } })
  let recs = await records(api)
  expect(recs).toHaveLength(1)
  expect(recs[0].duration).toBe(42 * 60)
  expect(new Date(recs[0].startTime).getHours()).toBe(14)

  await api.put('/api/timetable', { data: { date, entries: [row('14:25', '15:30')] } })
  recs = await records(api)
  expect(recs.map((r) => r.duration)).toEqual([65 * 60])

  await api.put('/api/timetable', { data: { date, entries: [row(null, null)] } })
  expect(await records(api)).toHaveLength(0)
})
