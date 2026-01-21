'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Unlock } from 'lucide-react'
import { toast } from 'sonner'

interface EndReservationButtonProps {
  borrowRequestId: string
  itemId: string
}

export function EndReservationButton({
  borrowRequestId,
  itemId,
}: EndReservationButtonProps) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)

  const supabase = createClient()

  const handleEndReservation = async () => {
    setIsEnding(true)
    try {
      // Update borrow request status to returned
      const { error: requestError } = await supabase
        .from('borrow_requests')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString(),
        })
        .eq('id', borrowRequestId)

      if (requestError) throw requestError

      // Update item status back to available
      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'available' })
        .eq('id', itemId)

      if (itemError) throw itemError

      toast.success('Item is now available')
      router.refresh()
    } catch (err: any) {
      console.error('Failed to end reservation:', err)
      toast.error(err.message || 'Failed to end reservation')
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEndReservation}
      disabled={isEnding}
    >
      {isEnding ? (
        <>
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Ending...
        </>
      ) : (
        <>
          <Unlock className="mr-2 h-3 w-3" />
          End Reservation
        </>
      )}
    </Button>
  )
}
