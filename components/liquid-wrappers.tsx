'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import {
  liquidSpring,
  liquidStaggerContainer,
  liquidStaggerChild,
} from '@/lib/liquidTransitions'

/** Wraps each route's content — re-mounts on navigation with liquid spring */
export function LiquidTabWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={liquidSpring}
      className="liquid-page-transition"
    >
      {children}
    </motion.div>
  )
}

/** Stagger container — children enter one after another */
export function LiquidStagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={liquidStaggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Single stagger child — use inside <LiquidStagger> */
export function LiquidStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={liquidStaggerChild} className={className}>
      {children}
    </motion.div>
  )
}
