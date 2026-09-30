import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EditPersonalInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPersonalInfoDialog({ open, onOpenChange }: EditPersonalInfoDialogProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFetching(true)
    setError(null)
    fetch('/api/user-info')
      .then((res) => res.json())
      .then((data) => {
        setName(data.name === 'User' ? '' : data.name || '')
      })
      .catch(() => setName(''))
      .finally(() => setFetching(false))
  }, [open])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name cannot be empty.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        setError('Could not save. Try again.')
        return
      }
      onOpenChange(false)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 p-0" aria-describedby={undefined}>
        <div className="px-6 pt-6">
          <DialogTitle className="font-serif text-2xl font-normal">Personal info</DialogTitle>
        </div>
        <div className="px-6 py-5">
          <label htmlFor="edit-name" className="text-xs uppercase tracking-wider text-muted-foreground">
            Display name
          </label>
          <Input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || fetching}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
            }}
            className="mt-2 focus-visible:ring-1 focus-visible:ring-offset-0"
          />
          <p className="mt-2 text-xs text-muted-foreground">Used in the greeting.</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || fetching} className="rounded-full px-5">
            {loading ? 'Saving' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
