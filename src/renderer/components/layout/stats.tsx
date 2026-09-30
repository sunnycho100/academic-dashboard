import { Task } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface StatsProps {
  tasks: Task[]
  completedTodayCount: number
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

export function Stats({ tasks, completedTodayCount }: StatsProps) {
  const totalTasks = tasks.length
  const dueSoonTasks = tasks.filter((t) => {
    if (!t.dueAt) return false
    const dueDate = new Date(t.dueAt)
    const today = new Date()
    const twoDays = new Date(today)
    twoDays.setDate(twoDays.getDate() + 2)
    return dueDate >= today && dueDate <= twoDays && t.status === 'todo'
  }).length
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueAt) return false
    const dueDate = new Date(t.dueAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() < today.getTime() && t.status === 'todo'
  }).length

  const stats = [
    { label: 'tasks', value: totalTasks },
    { label: 'due soon', value: dueSoonTasks },
    { label: 'overdue', value: overdueTasks, urgent: overdueTasks > 0 },
    { label: 'done today', value: completedTodayCount },
  ]

  return (
    <div className="flex items-baseline gap-7 border-b border-border pb-4 mb-5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-2">
          <span className={`font-serif text-[2.5rem] leading-none ${stat.urgent ? 'text-destructive' : ''}`}>
            <AnimatedCounter value={stat.value} />
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
