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
import {
  CalendarIcon,
  Loader2,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface OwnerReservationFormProps {
  itemId: string
  itemName: string
  communityId: string
  currentMemberId: string
}

export function OwnerReservationForm({
  itemId,
  itemName,
  communityId,
  currentMemberId,
}: OwnerReservationFormProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 7))
  const [reason, setReason] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Please select dates')
      return
    }

    if (startDate > endDate) {
      toast.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDateOnly = new Date(startDate)
      startDateOnly.setHours(0, 0, 0, 0)

      const isFutureReservation = startDateOnly > today

      // Create a reservation (borrow request where owner is the borrower)
      const { error } = await supabase
        .from('borrow_requests')
        .insert({
          item_id: itemId,
          borrower_id: currentMemberId,
          status: isFutureReservation ? 'approved' : 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          message: reason.trim() || 'Owner reservation',
          owner_response: 'Reserved by owner',
          responded_at: new Date().toISOString(),
        })

      if (error) throw error

      // Only update item status if reservation starts today or earlier
      if (!isFutureReservation) {
        await supabase
          .from('items')
          .update({ status: 'borrowed' })
          .eq('id', itemId)
      }

      toast.success(isFutureReservation
        ? 'Reservation scheduled'
        : 'Item marked as unavailable')
      router.refresh()
      setIsExpanded(false)
      setReason('')
    } catch (err: any) {
      console.error('Reservation failed:', err)
      toast.error(err.message || 'Failed to reserve item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reserveDays = startDate && endDate && startDate <= endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0

  if (!isExpanded) {
    return (
      <Button
        className="w-full"
        onClick={() => setIsExpanded(true)}
      >
        <CalendarIcon className="h-4 w-4 mr-2" />
        Book Item
      </Button>
    )
  }

  return (
    <Card className="p-4 border-primary/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Book Your Item</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Reserve dates when this item is unavailable for borrowing.
      </p>

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
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {reserveDays > 0 && (
          <p className="text-xs text-muted-foreground">
            Unavailable for {reserveDays} day{reserveDays !== 1 ? 's' : ''}
          </p>
        )}

        {/* Reason */}
        <div className="space-y-1.5">
          <Label className="text-xs">Reason (Optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Personal use, lending to family..."
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
                Booking...
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-3 w-3" />
                Book
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
