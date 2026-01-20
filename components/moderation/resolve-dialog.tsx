'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Report } from './report-card'

interface ResolveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report | null
  action: 'resolve' | 'dismiss' | null
  onConfirm: (reportId: string, action: 'resolve' | 'dismiss', notes: string) => Promise<void>
}

export function ResolveDialog({
  open,
  onOpenChange,
  report,
  action,
  onConfirm,
}: ResolveDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!report || !action) return

    setLoading(true)
    try {
      await onConfirm(report.id, action, notes)
      setNotes('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNotes('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
          </DialogTitle>
          <DialogDescription>
            {action === 'resolve' ? (
              <>
                Mark this report as resolved. Add notes describing what action was taken
                (e.g., content removed, user warned, etc.).
              </>
            ) : (
              <>
                Dismiss this report if no action is needed. Optionally add notes
                explaining why the report was dismissed.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="notes">
            {action === 'resolve' ? 'Resolution Notes' : 'Dismissal Notes'}
            {action === 'resolve' && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id="notes"
            placeholder={
              action === 'resolve'
                ? 'Describe the action taken...'
                : 'Optional: Explain why this report was dismissed...'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (action === 'resolve' && !notes.trim())}
            variant={action === 'dismiss' ? 'secondary' : 'default'}
          >
            {loading ? 'Processing...' : action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
