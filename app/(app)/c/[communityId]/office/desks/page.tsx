'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Calendar,
  Check,
  X,
  Loader2,
  Monitor,
  Laptop,
  ArrowUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Desk, DeskBooking } from '@/lib/types/office'

interface DeskWithBooking extends Desk {
  booking?: DeskBooking & {
    member: {
      id: string
      display_name: string | null
    }
  }
}

export default function DesksPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [desks, setDesks] = useState<DeskWithBooking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookingDesk, setBookingDesk] = useState<string | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadDesksAndBookings()
  }, [dateStr])

  const loadDesksAndBookings = async () => {
    setLoading(true)
    try {
      // Get current user's member id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push('/')
        return
      }

      setCurrentMemberId(member.id)

      // Get all bookable desks
      const { data: deskData, error: deskError } = await supabase
        .from('desks')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_bookable', true)
        .neq('status', 'maintenance')
        .order('name')

      if (deskError) throw deskError

      // Get bookings for selected date
      const { data: bookingData } = await supabase
        .from('desk_bookings')
        .select(`
          *,
          member:community_members(id, display_name)
        `)
        .eq('community_id', communityId)
        .eq('booking_date', dateStr)
        .in('status', ['confirmed', 'checked_in'])

      // Merge bookings with desks
      const desksWithBookings = (deskData || []).map((desk) => {
        const booking = bookingData?.find((b) => b.desk_id === desk.id)
        return { ...desk, booking }
      })

      setDesks(desksWithBookings)
    } catch (error) {
      console.error('Error loading desks:', error)
      toast.error('Failed to load desks')
    } finally {
      setLoading(false)
    }
  }

  const handleBookDesk = async (deskId: string) => {
    if (!currentMemberId) return

    setBookingDesk(deskId)
    try {
      const { error } = await supabase.from('desk_bookings').insert({
        desk_id: deskId,
        community_id: communityId,
        member_id: currentMemberId,
        booking_date: dateStr,
        is_full_day: true,
        status: 'confirmed',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This desk is already booked for this date')
        } else {
          throw error
        }
        return
      }

      toast.success('Desk booked successfully')
      loadDesksAndBookings()
    } catch (error) {
      console.error('Error booking desk:', error)
      toast.error('Failed to book desk')
    } finally {
      setBookingDesk(null)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('desk_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled')
      loadDesksAndBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    }
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]
  const isPast = selectedDate < new Date(new Date().toISOString().split('T')[0])

  const equipmentIcons: Record<string, typeof Monitor> = {
    monitor: Monitor,
    dual_monitor: Monitor,
    docking_station: Laptop,
    standing_desk: ArrowUpDown,
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/c/${communityId}/office`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Desk Booking
          </h1>
          <p className="text-muted-foreground text-sm">
            Book a desk for your workday
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(-1)}
            disabled={isPast}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              {isToday && (
                <Badge variant="secondary" className="mt-1">Today</Badge>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Desk Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : desks.length === 0 ? (
        <Card className="p-8 text-center">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Desks Available</h3>
          <p className="text-muted-foreground">
            No bookable desks have been configured yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {desks.map((desk) => {
            const isBooked = !!desk.booking
            const isMyBooking = desk.booking?.member_id === currentMemberId
            const isBooking = bookingDesk === desk.id

            return (
              <Card
                key={desk.id}
                className={`p-4 ${
                  isBooked
                    ? isMyBooking
                      ? 'border-primary bg-primary/5'
                      : 'border-muted bg-muted/30'
                    : 'hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{desk.name}</h3>
                    {desk.desk_number && (
                      <p className="text-sm text-muted-foreground">
                        #{desk.desk_number}
                      </p>
                    )}
                  </div>
                  {isBooked ? (
                    isMyBooking ? (
                      <Badge variant="default">Your Booking</Badge>
                    ) : (
                      <Badge variant="secondary">Booked</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Available
                    </Badge>
                  )}
                </div>

                {/* Equipment */}
                {desk.equipment && desk.equipment.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {desk.equipment.slice(0, 4).map((eq) => {
                      const Icon = equipmentIcons[eq] || Monitor
                      return (
                        <div
                          key={eq}
                          className="p-1.5 rounded bg-muted"
                          title={eq.replace('_', ' ')}
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Booking Info or Action */}
                {isBooked ? (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Booked by: {desk.booking?.member?.display_name || 'Unknown'}
                    </p>
                    {isMyBooking && !isPast && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => handleCancelBooking(desk.booking!.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                ) : (
                  !isPast && (
                    <Button
                      className="w-full mt-3"
                      onClick={() => handleBookDesk(desk.id)}
                      disabled={isBooking}
                    >
                      {isBooking ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Book This Desk
                    </Button>
                  )
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Your Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
          <span>Booked by Others</span>
        </div>
      </div>
    </div>
  )
}
