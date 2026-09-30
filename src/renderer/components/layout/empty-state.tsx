import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddCategory: () => void
}

export function EmptyState({ onAddCategory }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center">
        <h2 className="font-serif text-2xl text-foreground">Welcome to Class Catch-up!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a course for each class, then add its lectures, assignments and exams.
        </p>
        <Button onClick={onAddCategory} className="mt-6">
          Add your first course
        </Button>
      </div>
    </div>
  )
}
