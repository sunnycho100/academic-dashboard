// The "logical day": Time records lets the day run from a start hour to an end hour that
// may pass midnight (27 = 3 AM next day). Every view that asks "what is today" uses this.

/** localStorage key of the Time records day boundaries, `{ start, end }` in hours */
export const DAY_BOUNDARIES_KEY = 'timeRecords-dayBoundaries'
export const DEFAULT_START_HOUR = 6 // 6 AM
export const DEFAULT_END_HOUR = 24 // midnight

export function dayBoundaries(): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR
  let endHour = DEFAULT_END_HOUR
  try {
    const saved = localStorage.getItem(DAY_BOUNDARIES_KEY)
    if (saved) {
      const { start, end } = JSON.parse(saved)
      if (typeof start === 'number') startHour = start
      if (typeof end === 'number') endHour = end
    }
  } catch {}
  return { startHour, endHour }
}

/** Hour the day rolls over: midnight, or the day-end hour when the day runs past midnight. */
export function rolloverHour(endHour = dayBoundaries().endHour): number {
  return endHour > 24 ? endHour - 24 : 0
}

/** `now` moved back a day when it is past midnight but before the rollover (still yesterday's day). */
export function logicalDate(now: Date, endHour: number): Date {
  const day = new Date(now)
  if (now.getHours() < rolloverHour(endHour)) day.setDate(day.getDate() - 1)
  return day
}

export function isLogicalToday(date: Date, endHour: number, now = new Date()): boolean {
  return date.toDateString() === logicalDate(now, endHour).toDateString()
}

/** Local YYYY-MM-DD of the current logical day, with the boundaries it was computed from. */
export function logicalToday(now = new Date()): { date: string; startHour: number; endHour: number } {
  const { startHour, endHour } = dayBoundaries()
  const d = logicalDate(now, endHour)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { date, startHour, endHour }
}

/**
 * When the current day began: the latest rollover hour that has already passed.
 * The rollover is midnight, or the next morning when the day runs past midnight
 * (a 2 AM day end rolls over at 2 AM, so 1 AM still belongs to yesterday).
 */
export function currentDayStart(now: Date, rolloverHour: number): Date {
  const start = new Date(now)
  start.setHours(rolloverHour, 0, 0, 0)
  if (start > now) start.setDate(start.getDate() - 1)
  return start
}

/** Query string for GET /api/time-records covering one logical day (YYYY-MM-DD). */
export function timeRecordsDayQuery(date: string, startHour: number, endHour: number): string {
  return `date=${date}&tz=${new Date().getTimezoneOffset()}&startHour=${startHour}&endHour=${rolloverHour(endHour)}`
}
