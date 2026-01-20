'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, isSameDay, startOfDay, isAfter, isBefore } from 'date-fns'
import { typeIcons, typeLabels } from '@/components/resources/resource-card'

interface Resource {
  id: string
  name: string
  description: string | null
  type: string
  location: string | null
  capacity: number | null
  image_url: string | null
  requires_approval: boolean
  available: boolean
  rules: string | null
  min_booking_hours: number
  max_booking_hours: number
  advance_booking_days: number
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

export default function ResourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string
  const resourceId = params.resourceId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [resource, setResource] = useState<Resource | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Booking form state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [bookingNote, setBookingNote] = useState('')

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [resourceId, communitySlug])

  const initializePage = async () => {
    // Check if the value looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

    // Fetch community by slug or id
    let communityQuery = supabase
      .from('communities')
      .select('id, slug')
      .eq('status', 'active')

    if (isUUID) {
      communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
    } else {
      communityQuery = communityQuery.eq('slug', communitySlug)
    }

    const { data: community } = await communityQuery.single()

    if (!community) return

    setCommunityId(community.id)
  }

  useEffect(() => {
    if (communityId) {
      fetchData()
    }
  }, [communityId, resourceId])

  useEffect(() => {
    if (resource) {
      fetchBookingsForDate(selectedDate)
    }
  }, [selectedDate, resource])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get current member
      const { data: member } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push(`/c/${communitySlug}`)
        return
      }

      setCurrentMemberId(member.id)
      setIsAdmin(member.role === 'admin')

      // Get resource
      const { data: resourceData, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .eq('community_id', communityId)
        .single()

      if (error || !resourceData) {
        toast.error('Resource not found')
        router.push(`/c/${communitySlug}/resources`)
        return
      }

      setResource(resourceData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      toast.error('Failed to load resource')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBookingsForDate = async (date: Date) => {
    const startOfDayStr = format(date, 'yyyy-MM-dd')
    const endOfDayStr = format(addDays(date, 1), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        member:borrower_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('resource_id', resourceId)
      .gte('start_time', startOfDayStr)
      .lt('start_time', endOfDayStr)
      .in('status', ['pending', 'approved', 'active'])
      .order('start_time')

    if (!error && data) {
      setBookings(data.map((b: any) => ({
        ...b,
        member: b.member as Booking['member'],
      })))
    }
  }

  const handleBooking = async () => {
    if (!resource || !currentMemberId) return

    // Validate times
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = parseInt(endTime.split(':')[0])

    if (endHour <= startHour) {
      toast.error('End time must be after start time')
      return
    }

    const duration = endHour - startHour
    if (duration < resource.min_booking_hours) {
      toast.error(`Minimum booking is ${resource.min_booking_hours} hour(s)`)
      return
    }

    if (duration > resource.max_booking_hours) {
      toast.error(`Maximum booking is ${resource.max_booking_hours} hours`)
      return
    }

    // Check if date is within allowed range
    const maxDate = addDays(new Date(), resource.advance_booking_days)
    if (isAfter(selectedDate, maxDate)) {
      toast.error(`Can only book up to ${resource.advance_booking_days} days in advance`)
      return
    }

    // Check for conflicts
    const startDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${startTime}:00`
    const endDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${endTime}:00`

    const hasConflict = bookings.some((booking) => {
      const bookingStart = new Date(booking.start_time)
      const bookingEnd = new Date(booking.end_time)
      const newStart = new Date(startDateTime)
      const newEnd = new Date(endDateTime)
      return (
        (newStart >= bookingStart && newStart < bookingEnd) ||
        (newEnd > bookingStart && newEnd <= bookingEnd) ||
        (newStart <= bookingStart && newEnd >= bookingEnd)
      )
    })

    if (hasConflict) {
      toast.error('This time slot conflicts with an existing booking')
      return
    }

    setIsBooking(true)
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          community_id: communityId,
          resource_id: resourceId,
          borrower_id: currentMemberId,
          start_time: startDateTime,
          end_time: endDateTime,
          status: resource.requires_approval ? 'pending' : 'approved',
          message: bookingNote.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(
        resource.requires_approval
          ? 'Booking request submitted for approval'
          : 'Booking confirmed!'
      )

      setBookingDialogOpen(false)
      setBookingNote('')
      fetchBookingsForDate(selectedDate)
    } catch (err: any) {
      console.error('Booking failed:', err)
      toast.error(err.message || 'Failed to create booking')
    } finally {
      setIsBooking(false)
    }
  }

  const Icon = resource ? typeIcons[resource.type] || CalendarIcon : CalendarIcon

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!resource) {
    return null
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/resources`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shared Spaces
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resource Info */}
        <div>
          <Card className="overflow-hidden mb-6">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {resource.image_url ? (
                <img
                  src={resource.image_url}
                  alt={resource.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon className="h-16 w-16 text-muted-foreground opacity-50" />
              )}
            </div>
          </Card>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{resource.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  <Icon className="h-3 w-3 mr-1" />
                  {typeLabels[resource.type] || resource.type}
                </Badge>
                {!resource.available && (
                  <Badge variant="secondary">Unavailable</Badge>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/c/${communitySlug}/admin/resources/${resourceId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>

          {resource.location && (
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {resource.location}
            </div>
          )}

          {resource.capacity && (
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              Capacity: {resource.capacity} people
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            {resource.min_booking_hours}-{resource.max_booking_hours} hours per booking
          </div>

          {resource.requires_approval ? (
            <Badge variant="outline" className="mb-4">
              <Clock className="h-3 w-3 mr-1" />
              Requires Admin Approval
            </Badge>
          ) : (
            <Badge variant="outline" className="mb-4 text-green border-green">
              <CheckCircle className="h-3 w-3 mr-1" />
              Instant Booking
            </Badge>
          )}

          {resource.description && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{resource.description}</p>
            </div>
          )}

          {resource.rules && (
            <Card className="p-4 bg-muted/50">
              <h3 className="font-medium mb-2">Rules & Guidelines</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {resource.rules}
              </p>
            </Card>
          )}
        </div>

        {/* Calendar & Bookings */}
        <div>
          <SectionHeader title="Book This Space" />
          <Card className="p-4 mb-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => {
                const today = startOfDay(new Date())
                const maxDate = addDays(today, resource.advance_booking_days)
                return isBefore(date, today) || isAfter(date, maxDate)
              }}
              className="mx-auto"
            />

            {resource.available && (
              <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Book for {format(selectedDate, 'MMM d, yyyy')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book {resource.name}</DialogTitle>
                    <DialogDescription>
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Select value={endTime} onValueChange={setEndTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Textarea
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      placeholder="Add a note about your booking..."
                      rows={3}
                    />
                  </div>

                  {resource.requires_approval && (
                    <p className="text-sm text-muted-foreground">
                      Your booking request will need admin approval.
                    </p>
                  )}

                  <DialogFooter>
                    <Button
                      onClick={handleBooking}
                      disabled={isBooking}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Booking...
                        </>
                      ) : resource.requires_approval ? (
                        'Request Booking'
                      ) : (
                        'Confirm Booking'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </Card>

          {/* Bookings for selected date */}
          <SectionHeader title={`Bookings for ${format(selectedDate, 'MMM d')}`} />
          <Card className="overflow-hidden">
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bookings for this date</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookings.map((booking) => {
                  const isOwn = booking.member?.id === currentMemberId
                  return (
                    <div
                      key={booking.id}
                      className="p-4 flex items-center gap-4"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={booking.member?.avatar_url || undefined} />
                        <AvatarFallback>
                          {booking.member?.display_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {booking.member?.display_name || 'Member'}
                          {isOwn && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </p>
                      </div>
                      <Badge
                        variant={booking.status === 'approved' ? 'default' : 'secondary'}
                      >
                        {booking.status === 'approved' && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {booking.status === 'pending' && (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {booking.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
