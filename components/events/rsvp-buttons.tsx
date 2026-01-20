'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, X, HelpCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RsvpButtonsProps {
  eventId: string
  communityId: string
  currentStatus?: string | null
  canRsvp: boolean
  isPastEvent: boolean
  isCancelled: boolean
}

export function RsvpButtons({
  eventId,
  communityId,
  currentStatus,
  canRsvp,
  isPastEvent,
  isCancelled,
}: RsvpButtonsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRsvp = async (newStatus: 'going' | 'maybe' | 'not_going') => {
    if (!canRsvp) return

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to RSVP')
        return
      }

      // Get member ID
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        toast.error('You must be a member to RSVP')
        return
      }

      // Upsert RSVP
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({
          event_id: eventId,
          member_id: member.id,
          status: newStatus,
          responded_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,member_id',
        })

      if (error) throw error

      setStatus(newStatus)
      router.refresh()

      const messages = {
        going: "You're going to this event!",
        maybe: "You've marked yourself as maybe",
        not_going: "You've declined this event",
      }
      toast.success(messages[newStatus])
    } catch (err) {
      console.error('Failed to RSVP:', err)
      toast.error('Failed to update RSVP')
    } finally {
      setIsLoading(false)
    }
  }

  if (isPastEvent) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        This event has ended
      </p>
    )
  }

  if (isCancelled) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        This event has been cancelled
      </p>
    )
  }

  if (!canRsvp && !status) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        RSVP is closed for this event
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        variant={status === 'going' ? 'default' : 'outline'}
        className={cn(
          'w-full justify-start',
          status === 'going' && 'bg-green-600 hover:bg-green-700'
        )}
        onClick={() => handleRsvp('going')}
        disabled={isLoading || (!canRsvp && status !== 'going')}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Going
      </Button>
      <Button
        variant={status === 'maybe' ? 'default' : 'outline'}
        className={cn(
          'w-full justify-start',
          status === 'maybe' && 'bg-amber-600 hover:bg-amber-700'
        )}
        onClick={() => handleRsvp('maybe')}
        disabled={isLoading || (!canRsvp && status !== 'maybe')}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <HelpCircle className="h-4 w-4 mr-2" />
        )}
        Maybe
      </Button>
      <Button
        variant={status === 'not_going' ? 'default' : 'outline'}
        className={cn(
          'w-full justify-start',
          status === 'not_going' && 'bg-gray-600 hover:bg-gray-700'
        )}
        onClick={() => handleRsvp('not_going')}
        disabled={isLoading || (!canRsvp && status !== 'not_going')}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <X className="h-4 w-4 mr-2" />
        )}
        Can&apos;t Go
      </Button>
    </div>
  )
}
