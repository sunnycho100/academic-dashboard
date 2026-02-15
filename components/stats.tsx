'use client'

import { Task } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Clock, ListTodo } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface StatsProps {
  tasks: Task[]
  completedTodayCount: number
  todayRemainingCount: number
}

function ProgressRing({ progress, size = 36, strokeWidth = 3, color }: {
  progress: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  )
}

function AnimatedCounter({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 12, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -12, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="inline-block tabular-nums"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

export function Stats({ tasks, completedTodayCount, todayRemainingCount }: StatsProps) {
  const totalTasks = tasks.length
  const todayTotal = completedTodayCount + todayRemainingCount
  const completionPercent = todayTotal > 0 ? Math.round((completedTodayCount / todayTotal) * 100) : 0
  const dueSoonTasks = tasks.filter((t) => {
    const dueDate = new Date(t.dueAt)
    const today = new Date()
    const twoDays = new Date(today)
    twoDays.setDate(twoDays.getDate() + 2)
    return dueDate >= today && dueDate <= twoDays && t.status === 'todo'
  }).length
  const overdueTasks = tasks.filter((t) => {
    const dueDate = new Date(t.dueAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() < today.getTime() && t.status === 'todo'
  }).length

  const stats = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: ListTodo,
      color: '#3b82f6',
      bgGlow: 'hover:shadow-blue-500/20',
    },
    {
      label: 'Completed',
      value: completedTodayCount,
      icon: CheckCircle2,
      color: '#22c55e',
      bgGlow: 'hover:shadow-green-500/20',
      showProgress: true,
    },
    {
      label: 'Due Soon',
      value: dueSoonTasks,
      icon: Clock,
      color: '#eab308',
      bgGlow: 'hover:shadow-yellow-500/20',
    },
    {
      label: 'Overdue',
      value: overdueTasks,
      icon: AlertCircle,
      color: '#f87171',
      bgGlow: 'hover:shadow-red-400/20',
      isUrgent: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.97 }}
        >
          <Card className={`relative overflow-hidden rounded-xl border-border/50 transition-shadow duration-300 hover:shadow-lg h-full ${stat.bgGlow}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className="relative flex items-center justify-center w-9 h-9">
                {stat.showProgress ? (
                  <div className="relative flex items-center justify-center">
                    <ProgressRing progress={completionPercent} color={stat.color} />
                    <span className="absolute text-[9px] font-bold text-muted-foreground">
                      {completionPercent}%
                    </span>
                  </div>
                ) : (
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-bold tracking-tight">
                <AnimatedCounter value={stat.value} />
              </div>
              {/* Subtle bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] rounded-full"
                style={{ backgroundColor: stat.color }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
