'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: string
  iconColor: string
  gradient: string
  delay: number
  show: boolean
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor,
  gradient,
  delay,
  show,
}: MetricCardProps) {
  return (
    <motion.div
      className="flex-1 min-w-[110px] rounded-xl border border-white/[0.08] p-3 flex flex-col gap-1.5 relative overflow-hidden group"
      style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
      initial={{ opacity: 0, y: 12, scale: 0.95, z: 0 }}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 12,
        scale: show ? 1 : 0.95,
        z: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        delay,
      }}
    >
      {/* Gradient background */}
      <div className={cn('absolute inset-0 opacity-[0.07] dark:opacity-[0.12]', gradient)} />
      {/* Glass surface */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/[0.03] dark:bg-white/[0.02]" />
      {/* Inset highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: iconColor + '18' }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</span>
        </div>
        <span className="text-xl font-bold tabular-nums tracking-tight mt-1 block">{value}</span>
      </div>
    </motion.div>
  )
}
