// Type-a-date parsing for the due date picker. Covers what people type for coursework
// deadlines; ponytail: no times or recurrence, swap in chrono-node if those are ever needed.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const at = (base: Date, days: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)

/** A real calendar date (rejects Feb 31), on or after today, else the same date next year. */
function upcoming(today: Date, month: number, day: number): Date | null {
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const d = new Date(year, month, day)
    if (d.getMonth() !== month || d.getDate() !== day) return null
    if (d >= today) return d
  }
  return null
}

const monthIndex = (word: string) => MONTHS.indexOf(word.slice(0, 3))

/** Parse text like "tomorrow", "fri", "in 3 days", "oct 5" or "10/5" into a local date, or null. */
export function parseDue(text: string, now = new Date()): Date | null {
  const s = text.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return null
  const today = at(now, 0)

  if ('today'.startsWith(s) && s.length >= 3) return today
  if (s === 'tmr' || s === 'tmrw' || ('tomorrow'.startsWith(s) && s.length >= 3)) return at(today, 1)
  if (s === 'next week') return at(today, 7)

  let m = s.match(/^(?:in )?(\d+) ?(d|days?|w|weeks?)$/)
  if (m) return at(today, Number(m[1]) * (m[2].startsWith('w') ? 7 : 1))

  // Weekday: the next one after today ("wed" on a Wednesday means next week)
  m = s.match(/^(?:next )?([a-z]{3,})$/)
  if (m) {
    const wd = DAYS.indexOf(m[1].slice(0, 3))
    if (wd >= 0 && 'sunday monday tuesday wednesday thursday friday saturday'.includes(m[1])) {
      return at(today, ((wd - today.getDay() + 6) % 7) + 1)
    }
  }

  // "oct 5", "october 5", "5 oct"
  m = s.match(/^([a-z]{3,}) (\d{1,2})$/) ?? s.match(/^(\d{1,2}) ([a-z]{3,})$/)
  if (m) {
    const [word, num] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]]
    const month = monthIndex(word)
    return month >= 0 ? upcoming(today, month, Number(num)) : null
  }

  // "10/5" (month/day)
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m) return upcoming(today, Number(m[1]) - 1, Number(m[2]))

  // A bare day of the month: this month if still ahead, else next month
  m = s.match(/^(\d{1,2})$/)
  if (m) {
    const day = Number(m[1])
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day)
    if (thisMonth.getDate() === day && thisMonth >= today) return thisMonth
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, day)
    return nextMonth.getDate() === day ? nextMonth : null
  }

  return null
}
