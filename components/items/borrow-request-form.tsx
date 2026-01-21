'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  CalendarIcon,
  Loader2,
  Send,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface BorrowRequestFormProps {
  itemId: string
  itemName: string
  ownerUserId: string
  communityId: string
  communitySlug: string
  currentMemberId: string
}

export function BorrowRequestForm({
  itemId,
  itemName,
  ownerUserId,
  communityId,
  communitySlug,
  currentMemberId,
}: BorrowRequestFormProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 8))
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Please select dates')
      return
    }

    if (startDate >= endDate) {
      toast.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)
    try {
      // Create borrow request
      const { data: borrowRequest, error } = await supabase
        .from('borrow_requests')
        .insert({
          community_id: communityId,
          item_id: itemId,
          borrower_id: currentMemberId,
          status: 'pending',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          message: message.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create notification for item owner
      await supabase
        .from('notifications')
        .insert({
          user_id: ownerUserId,
          community_id: communityId,
          type: 'borrow_request',
          title: 'New Borrow Request',
          message: `Someone wants to borrow your "${itemName}"`,
          data: { borrow_request_id: borrowRequest.id, item_id: itemId },
        })

      toast.success('Borrow request sent!')
      router.refresh()
      setIsExpanded(false)
      setMessage('')
    } catch (err: any) {
      console.error('Submit failed:', err)
      toast.error(err.message || 'Failed to send request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const borrowDays = startDate && endDate && startDate < endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (!isExpanded) {
    return (
      <Button className="w-full" onClick={() => setIsExpanded(true)}>
        <MessageCircle className="h-4 w-4 mr-2" />
        Request to Borrow
      </Button>
    )
  }

  return (
    <Card className="p-4 border-primary/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Request to Borrow</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {startDate ? format(startDate, 'MMM d') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {endDate ? format(endDate, 'MMM d') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < (startDate || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {borrowDays > 0 && (
          <p className="text-xs text-muted-foreground">
            Borrowing for {borrowDays} day{borrowDays !== 1 ? 's' : ''}
          </p>
        )}

        {/* Message */}
        <div className="space-y-1.5">
          <Label className="text-xs">Message (Optional)</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message for the owner..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || !startDate || !endDate}
            className="flex-1"
            size="sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-3 w-3" />
                Send Request
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
