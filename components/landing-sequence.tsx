'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const WRITE_DURATION = 1.8 // seconds for the cursive writing reveal
const HOLD_DURATION = 2400 // ms to hold after writing completes
const REVEAL_DURATION = 1.0 // seconds for dashboard reveal transition

// Premium deceleration curve
const APPLE_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]
// Smoother ease for the writing sweep
const WRITE_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

interface LandingSequenceProps {
  onComplete: () => void
  children: React.ReactNode
}

export function LandingSequence({ onComplete, children }: LandingSequenceProps) {
  const [phase, setPhase] = useState<'loading' | 'greeting' | 'reveal' | 'done'>('loading')
  const [userName, setUserName] = useState<string | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Fetch user name from DB
  useEffect(() => {
    fetch('/api/user-info')
      .then((res) => res.json())
      .then((data) => {
        setUserName(data.name || 'User')
        setPhase('greeting')
      })
      .catch(() => {
        setUserName('User')
        setPhase('greeting')
      })
  }, [])

  const writeDuration = prefersReducedMotion ? 0.4 : WRITE_DURATION

  // Auto-advance after writing + hold
  useEffect(() => {
    if (phase !== 'greeting') return

    const totalWait = writeDuration * 1000 + HOLD_DURATION

    const t1 = setTimeout(() => {
      setPhase('reveal')
    }, totalWait)

    const t2 = setTimeout(() => {
      setPhase('done')
      onComplete()
    }, totalWait + REVEAL_DURATION * 1000)

    timersRef.current = [t1, t2]

    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [phase, onComplete, writeDuration])

  // Click to skip
  const handleClick = () => {
    if (phase === 'greeting' || phase === 'loading') {
      timersRef.current.forEach(clearTimeout)
      setPhase('reveal')
      const t = setTimeout(() => {
        setPhase('done')
        onComplete()
      }, REVEAL_DURATION * 1000)
      timersRef.current = [t]
    }
  }

  if (phase === 'done') {
    return <>{children}</>
  }

  return (
    <>
      {/* Landing overlay */}
      <AnimatePresence>
        {(phase === 'loading' || phase === 'greeting' || phase === 'reveal') && (
          <motion.div
            className="landing-overlay"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: REVEAL_DURATION,
              ease: APPLE_EASE,
            }}
            onClick={handleClick}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: phase === 'reveal' ? 'default' : 'pointer',
              pointerEvents: phase === 'reveal' ? 'none' : 'auto',
            }}
          >
            {/* Background */}
            <div className="landing-bg" />

            {/* Ambient glow */}
            <div className="landing-ambient-glow" />

            {/* Greeting text — cursive writing reveal */}
            <div className="landing-text-container">
              {phase === 'greeting' && userName && (
                <div className="landing-greeting-wrapper">
                  {/* Background text (invisible, holds layout) */}
                  <h1 className="landing-greeting landing-greeting-ghost" aria-hidden="true">
                    Welcome Back, {userName}
                  </h1>

                  {/* Revealed text — clip-path sweeps left to right */}
                  <motion.h1
                    className="landing-greeting landing-greeting-visible"
                    aria-label={`Welcome Back, ${userName}`}
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: 'inset(0 0% 0 0)' }}
                    transition={{
                      duration: writeDuration,
                      ease: WRITE_EASE,
                    }}
                  >
                    Welcome Back, {userName}
                  </motion.h1>

                  {/* Cursor / pen indicator that follows the reveal */}
                  <motion.span
                    className="landing-cursor"
                    initial={{ left: '0%', opacity: 0 }}
                    animate={{ left: '100%', opacity: [0, 1, 1, 1, 0] }}
                    transition={{
                      left: {
                        duration: writeDuration,
                        ease: WRITE_EASE,
                      },
                      opacity: {
                        duration: writeDuration,
                        times: [0, 0.05, 0.85, 0.95, 1],
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Decorative line */}
            {phase === 'greeting' && (
              <motion.div
                className="landing-line"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  delay: writeDuration + 0.1,
                  ease: APPLE_EASE,
                }}
              />
            )}

            {/* Activity indicator */}
            <motion.div
              className="landing-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: APPLE_EASE }}
            >
              <span className="landing-pulse-dot" />
              <span className="landing-indicator-text">Your agent is active</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard content — always rendered underneath the overlay */}
      {children}
    </>
  )
}
