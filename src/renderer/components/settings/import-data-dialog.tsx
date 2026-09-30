import { useRef } from 'react'
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
import { Category, Task } from '@/lib/types'

export interface AppState {
  categories: Category[]
  tasks: Task[]
}

interface ImportDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: AppState) => void
}

export function ImportDataDialog({
  open,
  onOpenChange,
  onImport,
}: ImportDataDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppState

        // Validate the data structure
        if (!data.categories || !data.tasks) {
          throw new Error('Invalid data format')
        }

        onImport(data)
        onOpenChange(false)
      } catch (error) {
        alert('Could not import that file. Choose a JSON file exported from this app.')
        console.error('Import error:', error)
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-normal">Import data</AlertDialogTitle>
            <AlertDialogDescription>
              Your current courses and tasks are replaced by the ones in the file. Export first if
              you want to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 rounded-full border-0 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportClick} className="rounded-full">
              Choose file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
