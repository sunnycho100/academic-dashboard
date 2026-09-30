import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ClearDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ClearDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: ClearDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl font-normal">Clear all data?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes every course and task on this Mac. Completed task history and time
            records are kept. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 rounded-full border-0 bg-transparent">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: 'destructive' }), 'rounded-full')}
          >
            Clear all data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
