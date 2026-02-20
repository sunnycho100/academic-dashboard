'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
]

/**
 * Detects user inactivity. After `timeoutMs` of no interaction,
 * `isIdle` becomes true. Any user activity resets the timer.
 *
 * Also respects Page Visibility API — if the tab is hidden for
 * longer than the timeout, it's considered idle.
 *
 * @param timeoutMs  Milliseconds of inactivity before idle (default: 5 min)
 * @returns {{ isIdle: boolean, resetIdle: () => void }}
 */
export function useIdleDetector(timeoutMs = 5 * 60 * 1000) {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hiddenAtRef = useRef<number | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs)
  }, [timeoutMs])

  const handleActivity = useCallback(() => {
    if (isIdle) setIsIdle(false)
    resetTimer()
  }, [isIdle, resetTimer])

  // Force wake-up (for external callers)
  const resetIdle = useCallback(() => {
    setIsIdle(false)
    resetTimer()
  }, [resetTimer])

  // Attach event listeners
  useEffect(() => {
    // Start the idle timer immediately
    resetTimer()

    // Throttle high-frequency events (mousemove, scroll)
    let lastCall = 0
    const throttledHandler = () => {
      const now = Date.now()
      if (now - lastCall < 1000) return // at most once per second
      lastCall = now
      handleActivity()
    }

    for (const event of IDLE_EVENTS) {
      window.addEventListener(event, throttledHandler, { passive: true })
    }

    // Page Visibility — if hidden for > timeout, go idle
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
      } else {
        // Tab visible again
        if (hiddenAtRef.current) {
          const hiddenDuration = Date.now() - hiddenAtRef.current
          hiddenAtRef.current = null
          if (hiddenDuration >= timeoutMs) {
            setIsIdle(true)
          } else {
            handleActivity()
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const event of IDLE_EVENTS) {
        window.removeEventListener(event, throttledHandler)
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [handleActivity, resetTimer, timeoutMs])

  return { isIdle, resetIdle }
}
