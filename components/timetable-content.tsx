'use client'

import { motion } from 'framer-motion'
import { Timetable } from '@/components/timetable'

export function TimetableContent() {
  return (
    <motion.div
      key="timetable"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full min-h-0"
    >
      <Timetable />
    </motion.div>
  )
}
