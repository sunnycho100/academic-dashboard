import { useEffect, useRef } from 'react'
import { useLiveWork } from '@/hooks/use-live-work'
import { showEarnings } from '@/lib/prefs'

/**
 * Sends the macOS widget what it should show. Each status says where the numbers stood and
 * whether they are counting, so the widget can keep counting minute by minute on its own; a
 * new one goes out only when that changes (start, pause, switch task, settings) or every
 * 10 minutes to pick up edited records.
 */
export function WidgetFeed() {
  const work = useLiveWork()
  const sent = useRef({ key: '', at: 0 })
  // Running means some timer (a task or Personal dev) is counting, so today's total grows too
  const running = work.state === 'running'
  const earnings = showEarnings()
  const key = JSON.stringify([work.title, work.state, work.since, work.rate, earnings, Math.round(work.todayTotal / 600)])

  useEffect(() => {
    const now = Date.now()
    if (key === sent.current.key && now - sent.current.at < 10 * 60_000) return
    sent.current = { key, at: now }
    const status = {
      title: work.title,
      state: work.state,
      since: work.since ? new Date(work.since).getTime() : null,
      elapsed: work.elapsed,
      elapsedRunning: running,
      today: work.todayTotal,
      todayRunning: running,
      rate: work.rate,
      showEarnings: earnings, // Settings > Timer > Show earnings
      at: now,
    }
    fetch('/api/widget-status', { method: 'POST', body: JSON.stringify(status) }).catch(() => {})
  })
  return null
}
