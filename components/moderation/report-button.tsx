'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'

interface ReportButtonProps {
  communityId: string
  targetType: 'member' | 'item' | 'news' | 'comment' | 'booking'
  targetId: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

const reasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'dangerous', label: 'Dangerous/Harmful' },
  { value: 'other', label: 'Other' },
]

export function ReportButton({
  communityId,
  targetType,
  targetId,
  variant = 'ghost',
  size = 'sm',
  className,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason) return

    setLoading(true)
    try {
      const res = await fetch(`/api/communities/${communityId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          description: description.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('Report submitted', {
          description: 'Thank you for helping keep our community safe.',
        })
        setOpen(false)
        setReason('')
        setDescription('')
      } else {
        const data = await res.json()
        toast.error('Failed to submit report', {
          description: data.error || 'Please try again later.',
        })
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
      toast.error('Failed to submit report', {
        description: 'Please try again later.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Flag className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Report</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us understand what&apos;s wrong. Reports are reviewed by community moderators.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for report <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help moderators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
