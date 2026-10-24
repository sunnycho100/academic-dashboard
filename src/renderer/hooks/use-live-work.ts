import { useEffect, useState } from 'react'
import { rolloverHour, todayRecordsUrl } from '@/hooks/use-today-session'
import { currentDayStart, pausedSince } from '@/lib/task-format'
import { runningPersonalDev } from '@/components/today/personal-dev-tracker'
import { earned, hourlyRate, showSeconds } from '@/lib/prefs'

type Rec = { taskId: string | null; taskTitle: string; categoryName: string; categoryColor: string; duration: number }

interface Live {
  kind: 'task' | 'dev'
  id: string
  title: string
  /** Null while paused */
  segmentStartedAt: string | null
}

/** Timers running or paused right now, read from the same localStorage the main window writes. */
function readLive(): Live[] {
  const live: Live[] = []
  const dayStart = currentDayStart(new Date(), rolloverHour())
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('class-catchup-timers')) continue
      const data = JSON.parse(localStorage.getItem(key) || '{}') as Record<
        string,
        { isRunning?: boolean; isPaused?: boolean; segmentStartedAt?: string | null; lastTickAt?: string | null; taskTitle?: string }
      >
      for (const [id, s] of Object.entries(data)) {
        if (!s.isRunning) continue
        // Paused today only, like the Today panel; an older pause is usually a finished task
        if (s.isPaused && !pausedSince(s, dayStart)) continue
        live.push({ kind: 'task', id, title: s.taskTitle || 'Task', segmentStartedAt: s.isPaused ? null : s.segmentStartedAt ?? null })
      }
    }
  } catch {}
  for (const d of runningPersonalDev()) live.push({ kind: 'dev', id: d.key, title: d.label, segmentStartedAt: d.segmentStartedAt })
  return live
}

const since = (iso: string | null, now: number) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000)) : 0)

export interface LiveWork {
  state: 'running' | 'paused' | 'idle'
  title: string | null
  color: string | null
  /** When the running stretch started (null while paused or idle) */
  since: string | null
  /** Seconds on the current activity (its saved time plus the running segment) */
  elapsed: number
  /** Seconds tracked today across everything */
  todayTotal: number
  earnedToday: number
  rate: number
  showSeconds: boolean
}

/**
 * What the desktop widget shows: the activity being worked on, its time, today's total and
 * what that time is worth. Ticks every second and re-reads when the main window changes a
 * timer (storage event) or saves a record.
 */
export function useLiveWork(): LiveWork {
  const [live, setLive] = useState(readLive)
  const [today, setToday] = useState<Rec[]>([])
  const [taskSaved, setTaskSaved] = useState<Record<string, number>>({})
  const [prefs, setPrefs] = useState(() => ({ rate: hourlyRate(), showSeconds: showSeconds() }))
  const [now, setNow] = useState(Date.now())

  const active = live.find((l) => l.segmentStartedAt) ?? live[0] ?? null
  const activeTaskId = active?.kind === 'task' ? active.id : null

  useEffect(() => {
    const load = () => {
      fetch(todayRecordsUrl())
        .then((r) => r.json())
        .then((recs: Rec[]) => Array.isArray(recs) && setToday(recs))
        .catch(() => {})
      // A task's time counts every day it was worked on, like the Today panel's timer
      if (activeTaskId) {
        fetch(`/api/time-records?taskIds=${activeTaskId}`)
          .then((r) => r.json())
          .then((recs: Rec[]) => Array.isArray(recs) && setTaskSaved({ [activeTaskId]: recs.reduce((s, r) => s + r.duration, 0) }))
          .catch(() => {})
      }
    }
    const reread = () => {
      setLive(readLive())
      setPrefs({ rate: hourlyRate(), showSeconds: showSeconds() })
      load()
    }
    load()
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(load, 30000)
    window.addEventListener('storage', reread)
    window.addEventListener('prefs-changed', reread)
    window.addEventListener('time-records-changed', load)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      window.removeEventListener('storage', reread)
      window.removeEventListener('prefs-changed', reread)
      window.removeEventListener('time-records-changed', load)
    }
  }, [activeTaskId])

  const liveSeconds = live.reduce((sum, l) => sum + since(l.segmentStartedAt, now), 0)
  const todayTotal = today.reduce((sum, r) => sum + r.duration, 0) + liveSeconds

  let elapsed = 0
  let color: string | null = null
  if (active) {
    const mine = active.kind === 'task'
      ? today.filter((r) => r.taskId === active.id)
      : today.filter((r) => r.categoryName === 'Personal Dev' && r.taskTitle === active.title)
    color = mine.at(-1)?.categoryColor ?? null
    const saved = active.kind === 'task' ? taskSaved[active.id] ?? 0 : mine.reduce((s, r) => s + r.duration, 0)
    elapsed = saved + since(active.segmentStartedAt, now)
  }

  return {
    state: !active ? 'idle' : active.segmentStartedAt ? 'running' : 'paused',
    title: active?.title ?? null,
    color,
    since: active?.segmentStartedAt ?? null,
    elapsed,
    todayTotal,
    earnedToday: earned(todayTotal, prefs.rate),
    rate: prefs.rate,
    showSeconds: prefs.showSeconds,
  }
}
