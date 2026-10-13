// Display preferences shared by the main window and the desktop widget. Both windows run on
// app://local, so localStorage is shared and the 'storage' event tells the other window.

const RATE_KEY = 'hourly-rate'
const SECONDS_KEY = 'show-seconds'

export function hourlyRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY))
    if (localStorage.getItem(RATE_KEY) !== null && Number.isFinite(v) && v >= 0) return v
  } catch {}
  return 20
}

export function showSeconds(): boolean {
  try {
    return localStorage.getItem(SECONDS_KEY) === 'true'
  } catch {
    return false
  }
}

export function setPref(key: 'hourly-rate' | 'show-seconds', value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
  window.dispatchEvent(new Event('prefs-changed'))
}

/** Money for a stretch of work at the hourly rate: 2h 15m at $20 is $45.00. */
export function earned(seconds: number, rate = hourlyRate()): number {
  return Math.floor((seconds / 3600) * rate * 100) / 100
}

export function formatMoney(amount: number, cents = true): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}
