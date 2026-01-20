'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Package,
  Loader2,
  XCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, isPast, isToday, isFuture } from 'date-fns'
import { typeIcons, typeLabels } from '@/components/resources/resource-card'

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  message: string | null
  created_at: string
  resource: {
    id: string
    name: string
    type: string
    location: string | null
    image_url: string | null
  } | null
  item: {
    id: string
    name: string
    images: string[] | null
    owner: {
      id: string
      display_name: string | null
    }
  } | null
}

export default function MyBookingsPage() {
  const params = useParams()
  const communityId = params.communityId as string

  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('upcoming')

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [communityId])

  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get member ID
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (!member) return

      // Get all bookings for this member
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          status,
          message,
          created_at,
          resource:resource_id (
            id,
            name,
            type,
            location,
            image_url
          ),
          item:item_id (
            id,
            name,
            images,
            owner:owner_id (
              id,
              display_name
            )
          )
        `)
        .eq('borrower_id', member.id)
        .eq('community_id', communityId)
        .order('start_time', { ascending: false })

      if (error) throw error

      setBookings((data || []).map((b: any) => ({
        ...b,
        resource: b.resource as Booking['resource'],
        item: b.item as Booking['item'],
      })))
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled')
      fetchBookings()
    } catch (err: any) {
      console.error('Cancel failed:', err)
      toast.error(err.message || 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  // Categorize bookings
  const upcomingBookings = bookings.filter(
    (b) => ['pending', 'approved'].includes(b.status) && isFuture(new Date(b.start_time))
  )
  const activeBookings = bookings.filter(
    (b) => b.status === 'active' || (b.status === 'approved' && isToday(new Date(b.start_time)))
  )
  const pastBookings = bookings.filter(
    (b) => b.status === 'completed' || (isPast(new Date(b.end_time)) && !isToday(new Date(b.start_time)))
  )
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected')

  const renderBookingCard = (booking: Booking) => {
    const isResource = !!booking.resource
    const name = isResource ? booking.resource?.name : booking.item?.name
    const Icon = isResource ? typeIcons[booking.resource?.type || 'other'] : Package

    const canCancel = ['pending', 'approved'].includes(booking.status) &&
      isFuture(new Date(booking.start_time))

    return (
      <Card key={booking.id} className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {isResource && booking.resource?.image_url ? (
              <img
                src={booking.resource.image_url}
                alt={name || ''}
                className="w-full h-full object-cover"
              />
            ) : !isResource && booking.item?.images?.[0] ? (
              <img
                src={booking.item.images[0]}
                alt={name || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={
                    isResource
                      ? `/c/${communityId}/resources/${booking.resource?.id}`
                      : `/c/${communityId}/items/${booking.item?.id}`
                  }
                  className="font-semibold hover:underline"
                >
                  {name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      booking.status === 'approved' || booking.status === 'active'
                        ? 'default'
                        : booking.status === 'pending'
                        ? 'secondary'
                        : 'outline'
                    }
                    className={
                      booking.status === 'cancelled' || booking.status === 'rejected'
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    {booking.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {booking.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {booking.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                    {booking.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {booking.status}
                  </Badge>
                  {isResource && (
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[booking.resource?.type || ''] || 'Resource'}
                    </Badge>
                  )}
                  {!isResource && (
                    <Badge variant="outline" className="text-xs">
                      Item Borrow
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(booking.start_time), 'EEEE, MMM d, yyyy')}
              </div>
              {isResource && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                  {format(new Date(booking.end_time), 'HH:mm')}
                </div>
              )}
              {!isResource && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(booking.start_time), 'MMM d')} -{' '}
                  {format(new Date(booking.end_time), 'MMM d, yyyy')}
                </div>
              )}
              {isResource && booking.resource?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {booking.resource.location}
                </div>
              )}
            </div>

            {canCancel && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3">
                    Cancel Booking
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Booking?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel your booking for "{name}"?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Booking'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/resources`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shared Spaces
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your resource bookings and borrow requests
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {activeBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No upcoming bookings</h3>
              <p className="text-muted-foreground mb-4">
                Book a shared space or request to borrow an item
              </p>
              <Button asChild>
                <Link href={`/c/${communityId}/resources`}>Browse Shared Spaces</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {activeBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No active bookings</h3>
              <p className="text-muted-foreground">
                Your active bookings will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No past bookings</h3>
              <p className="text-muted-foreground">
                Your completed bookings will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelledBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No cancelled bookings</h3>
              <p className="text-muted-foreground">
                Cancelled or rejected bookings will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {cancelledBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
