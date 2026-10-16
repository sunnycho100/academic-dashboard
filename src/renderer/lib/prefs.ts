// Display preferences shared by the main window and the desktop widget. Both windows run on
// app://local, so localStorage is shared and the 'storage' event tells the other window.

type Key = 'hourly-rate' | 'show-seconds' | 'palette' | 'empty-panel' | 'widget-hero' | 'show-earnings'

// While Edit display is open, choices are previewed here and only written on Save.
let preview: Partial<Record<Key, string>> = {}

function read(key: Key): string | null {
  if (key in preview) return preview[key] ?? null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const changed = () => typeof window !== 'undefined' && window.dispatchEvent(new Event('prefs-changed'))

export function hourlyRate(): number {
  const raw = read('hourly-rate')
  const v = Number(raw)
  return raw !== null && Number.isFinite(v) && v >= 0 ? v : 20
}

/** Whether money earned is shown anywhere (on by default). */
export function showEarnings(): boolean {
  return read('show-earnings') !== 'false'
}

export function showSeconds(): boolean {
  return read('show-seconds') === 'true'
}

/** Color theme id; 'classic' is the app's own look. */
export function palette(): string {
  return read('palette') ?? 'classic'
}

export type Hero = 'time' | 'money'
/** What the big number shows in the Today panel and the widget: time worked today, or what it earned. */
export function hero(): Hero {
  return showEarnings() && read('widget-hero') === 'money' ? 'money' : 'time'
}

export type EmptyPanel = 'now' | 'today' | 'week'
/** What the top of the Today panel shows when nothing is planned. */
export function emptyPanel(): EmptyPanel {
  const v = read('empty-panel')
  return v === 'today' || v === 'week' ? v : 'now'
}

export function setPref(key: Key, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
  changed()
}

/** Try a value without saving it (Edit display). */
export function previewPref(key: Key, value: string) {
  preview = { ...preview, [key]: value }
  changed()
}

/** Keys being previewed right now. */
export function previewing(key: Key): boolean {
  return key in preview
}

/** Save every previewed value, or drop them all and go back to what was saved. */
export function endPreview(save: boolean) {
  if (save) for (const [k, v] of Object.entries(preview)) setPref(k as Key, v as string)
  preview = {}
  changed()
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
