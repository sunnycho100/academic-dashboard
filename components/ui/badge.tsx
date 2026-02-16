import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-amber-500/20 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
        secondary:
          'border-white/10 bg-white/8 text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5',
        destructive:
          'border-red-500/20 bg-red-500/10 text-red-700 backdrop-blur-sm dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
        outline: 'text-foreground border-white/15 backdrop-blur-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
