import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => void
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  onAdd,
}: AddCategoryDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim())
      setName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-6">
            <DialogTitle className="font-serif text-2xl font-normal">New course</DialogTitle>
          </div>
          <div className="px-6 py-5">
            <label htmlFor="category-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </label>
            <Input
              id="category-name"
              placeholder="COMPSCI 400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="mt-2 focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()} className="rounded-full px-5">
              Add course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
