import { format } from 'date-fns'

// ── Types ──

export interface TimeRecord {
  id: string
  taskId: string | null
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
  startTime: string
  endTime: string
  duration: number // seconds
}

export interface NewRecordForm {
  taskTitle: string
  categoryName: string
  categoryColor: string
  taskType: string
  startTime: string
  endTime: string
}

// ── Constants ──

export { DEFAULT_START_HOUR, DEFAULT_END_HOUR } from '@/lib/day'
export const HOUR_HEIGHT = 80 // px per hour
export const QUARTER_HEIGHT = HOUR_HEIGHT / 4

// ── Helpers ──

export function formatDurationShort(seconds: number): string {
  const abs = Math.abs(seconds)
  const sign = seconds < 0 ? '-' : ''
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  if (h > 0 && m > 0) return `${sign}${h}h ${m}m`
  if (h > 0) return `${sign}${h}h`
  return `${sign}${m}m`
}

export function formatTimeLabel(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatHourLabel(hour: number): string {
  const h = hour % 24
  const h12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12}:00 ${ampm}`
}

export function formatHourOption(hour: number, isNextDay: boolean): string {
  const h = hour % 24
  const h12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12} ${ampm}${isNextDay ? ' (+1)' : ''}`
}

export function getBlockPosition(startTime: Date, endTime: Date, timelineStartHour: number) {
  let startHour = startTime.getHours() + startTime.getMinutes() / 60
  let endHour = endTime.getHours() + endTime.getMinutes() / 60
  // If times are past midnight (before timeline start), treat as next-day hours
  if (startHour < timelineStartHour) startHour += 24
  if (endHour < timelineStartHour) endHour += 24
  // Only wrap to next day if endHour is significantly before startHour (cross-midnight),
  // not when they're equal (zero-duration) or nearly equal
  if (endHour < startHour) endHour += 24
  const top = (startHour - timelineStartHour) * HOUR_HEIGHT + 16 // 16px top padding
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24) // min 24px
  return { top, height }
}

export function getCurrentTimePosition(timelineStartHour: number, timelineEndHour: number): number | null {
  const now = new Date()
  let currentHour = now.getHours() + now.getMinutes() / 60
  if (currentHour < timelineStartHour) currentHour += 24
  if (currentHour < timelineStartHour || currentHour > timelineEndHour) return null
  return (currentHour - timelineStartHour) * HOUR_HEIGHT + 16 // 16px top padding
}

/**
 * Build a Date from a selectedDate (logical day) and a HH:mm time string,
 * accounting for post-midnight extension hours.
 *
 * For a 10 AM–3 AM day boundary viewing Feb 6:
 *   - "14:30" → Feb 6 14:30 (within the day's main period)
 *   - "00:28" → Feb 7 00:28 (post-midnight extension, next calendar day)
 *   - "02:15" → Feb 7 02:15 (post-midnight extension, next calendar day)
 *   - "10:00" → Feb 6 10:00 (start of day)
 */
export function buildDateFromLogicalDay(
  selectedDate: Date,
  timeStr: string,
  timelineStartHour: number,
  timelineEndHour: number,
): Date {
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const dt = new Date(`${dateStr}T${timeStr}:00`)
  const hour = dt.getHours()
  const extensionHour = timelineEndHour > 24 ? timelineEndHour - 24 : 0

  // If the day extends past midnight and this time falls in the post-midnight
  // extension window (hour < extensionHour AND hour < startHour), then the
  // wall-clock time is on the NEXT calendar day.
  if (extensionHour > 0 && hour < extensionHour && hour < timelineStartHour) {
    dt.setDate(dt.getDate() + 1)
  }

  return dt
}
