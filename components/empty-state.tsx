'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, FolderPlus, ListTodo, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  onAddCategory: () => void
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
}

export function EmptyState({ onAddCategory }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="max-w-2xl rounded-2xl border-border/40 shadow-lg overflow-hidden relative">
          {/* Subtle shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

          <CardHeader className="pb-4">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
              <CardTitle className="text-2xl flex items-center gap-2.5 tracking-tight">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                Welcome to Class Catch-up!
                <Sparkles className="h-4 w-4 text-yellow-500/70" />
              </CardTitle>
            </motion.div>
            <CardDescription className="text-sm leading-relaxed mt-2">
              Your personal academic task management dashboard. Get started in three simple steps:
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
              {[
                {
                  num: 1,
                  icon: FolderPlus,
                  title: 'Create Categories',
                  desc: 'Add categories for your classes (e.g., COMPSCI400, MATH340). Each gets a unique color.',
                },
                {
                  num: 2,
                  icon: ListTodo,
                  title: 'Add Your Tasks',
                  desc: 'Create tasks for lectures, assignments, labs, and exam prep. Include due dates and notes.',
                },
                {
                  num: 3,
                  icon: null,
                  title: 'Stay on Track',
                  desc: 'Use "Due Soon" for upcoming work and "Overdue" to prioritize urgent tasks.',
                },
              ].map((step) => (
                <motion.div
                  key={step.num}
                  variants={item}
                  className="flex items-start gap-4 group"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      {step.icon && <step.icon className="h-4 w-4 text-muted-foreground" />}
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="pt-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={onAddCategory} size="lg" className="w-full rounded-xl h-12 text-base font-semibold shadow-sm">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Your First Category
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
