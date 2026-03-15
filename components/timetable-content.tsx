'use client'

import { motion } from 'framer-motion'
import { Timetable } from '@/components/timetable'

export function TimetableContent() {
  return (
    <motion.div
      key="timetable"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full min-h-0"
    >
      <Timetable />
    </motion.div>
  )
}
