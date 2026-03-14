'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface RollingCounterProps {
  value: number
  label: string
}

export function RollingCounter({ value, label }: RollingCounterProps) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 14, opacity: 0, scale: 0.7, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ y: -14, opacity: 0, scale: 0.7, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="inline-block tabular-nums font-semibold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <span className="text-muted-foreground/60 font-normal">{label}</span>
    </span>
  )
}
