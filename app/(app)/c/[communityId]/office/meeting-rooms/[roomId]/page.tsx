'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Loader2,
  Tv,
  Presentation,
  PenTool,
  Video,
  Phone,
  Camera,
  Mic,
  Coffee,
  Droplets,
  Cookie,
  UtensilsCrossed,
  Clock,
  Check,
  X,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type { MeetingRoom, RoomBooking } from '@/lib/types/office'

interface TimeSlot {
  time: string
  label: string
  isAvailable: boolean
  booking?: RoomBooking & { member?: { display_name: string | null } }
}

const equipmentIcons: Record<string, typeof Tv> = {
  projector: Presentation,
  tv_screen: Tv,
  whiteboard: PenTool,
  video_conferencing: Video,
  phone: Phone,
  webcam: Camera,
  microphone: Mic,
}

const amenityIcons: Record<string, typeof Coffee> = {
  coffee: Coffee,
  water: Droplets,
  snacks: Cookie,
  catering_available: UtensilsCrossed,
}

const equipmentLabels: Record<string, string> = {
  projector: 'Projector',
  tv_screen: 'TV Screen',
  whiteboard: 'Whiteboard',
  video_conferencing: 'Video Conferencing',
  phone: 'Conference Phone',
  webcam: 'Webcam',
  microphone: 'Microphone',
}

const amenityLabels: Record<string, string> = {
  coffee: 'Coffee',
  water: 'Water',
  snacks: 'Snacks',
  catering_available: 'Catering Available',
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const communityId = params.communityId as string
  const roomId = params.roomId as string
  const supabase = createClient()

  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [room, setRoom] = useState<MeetingRoom | null>(null)
  const [bookings, setBookings] = useState<(RoomBooking & { member?: { display_name: string | null } })[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate))
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  // Booking form state
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [selectedStartSlot, setSelectedStartSlot] = useState<string | null>(null)
  const [selectedEndSlot, setSelectedEndSlot] = useState<string | null>(null)
  const [bookingTitle, setBookingTitle] = useState('')
  const [bookingDescription, setBookingDescription] = useState('')

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadRoomAndBookings()
  }, [dateStr, roomId])

  const loadRoomAndBookings = async () => {
    setLoading(true)
    try {
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

      // Get room details
      const { data: roomData, error: roomError } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('community_id', communityId)
        .single()

      if (roomError || !roomData) {
        toast.error('Room not found')
        router.push(`/c/${communityId}/office/meeting-rooms`)
        return
      }

      setRoom(roomData)

      // Get bookings for selected date
      const startOfDay = `${dateStr}T00:00:00`
      const endOfDay = `${dateStr}T23:59:59`

      const { data: bookingData } = await supabase
        .from('room_bookings')
        .select(`
          *,
          member:community_members(display_name)
        `)
        .eq('room_id', roomId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .in('status', ['pending', 'confirmed'])
        .order('start_time')

      setBookings(bookingData || [])
    } catch (error) {
      console.error('Error loading room:', error)
      toast.error('Failed to load room details')
    } finally {
      setLoading(false)
    }
  }

  // Generate time slots (30 min intervals from 8 AM to 6 PM)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const now = new Date()
    const isToday = dateStr === now.toISOString().split('T')[0]

    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const slotDateTime = new Date(`${dateStr}T${timeStr}:00`)

        // Check if slot is in the past
        const isPast = isToday && slotDateTime < now

        // Check if slot conflicts with any booking
        const conflictingBooking = bookings.find((b) => {
          const bookingStart = new Date(b.start_time)
          const bookingEnd = new Date(b.end_time)
          return slotDateTime >= bookingStart && slotDateTime < bookingEnd
        })

        slots.push({
          time: timeStr,
          label: `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,
          isAvailable: !isPast && !conflictingBooking,
          booking: conflictingBooking,
        })
      }
    }

    return slots
  }, [dateStr, bookings])

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
    setSelectedStartSlot(null)
    setSelectedEndSlot(null)
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) return

    if (!selectedStartSlot) {
      setSelectedStartSlot(slot.time)
      setSelectedEndSlot(null)
    } else if (!selectedEndSlot) {
      // Ensure end is after start
      if (slot.time <= selectedStartSlot) {
        setSelectedStartSlot(slot.time)
        setSelectedEndSlot(null)
      } else {
        // Check if all slots between start and end are available
        const startIndex = timeSlots.findIndex((s) => s.time === selectedStartSlot)
        const endIndex = timeSlots.findIndex((s) => s.time === slot.time)

        const allAvailable = timeSlots
          .slice(startIndex, endIndex + 1)
          .every((s) => s.isAvailable)

        if (allAvailable) {
          setSelectedEndSlot(slot.time)
          setShowBookingDialog(true)
        } else {
          toast.error('Some slots in this range are already booked')
          setSelectedStartSlot(slot.time)
          setSelectedEndSlot(null)
        }
      }
    } else {
      // Reset and start new selection
      setSelectedStartSlot(slot.time)
      setSelectedEndSlot(null)
    }
  }

  const handleBookRoom = async () => {
    if (!selectedStartSlot || !selectedEndSlot || !currentMemberId || !room) return
    if (!bookingTitle.trim()) {
      toast.error('Please enter a meeting title')
      return
    }

    setBooking(true)
    try {
      // Calculate end time (add 30 min to last slot)
      const [endHour, endMin] = selectedEndSlot.split(':').map(Number)
      let finalEndHour = endHour
      let finalEndMin = endMin + 30
      if (finalEndMin >= 60) {
        finalEndHour++
        finalEndMin = 0
      }
      const endTimeStr = `${finalEndHour.toString().padStart(2, '0')}:${finalEndMin.toString().padStart(2, '0')}`

      const { error } = await supabase.from('room_bookings').insert({
        room_id: roomId,
        community_id: communityId,
        member_id: currentMemberId,
        title: bookingTitle.trim(),
        description: bookingDescription.trim() || null,
        start_time: `${dateStr}T${selectedStartSlot}:00`,
        end_time: `${dateStr}T${endTimeStr}:00`,
        status: room.requires_approval ? 'pending' : 'confirmed',
        attendees: [],
        external_attendees: [],
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This time slot is already booked')
        } else {
          throw error
        }
        return
      }

      toast.success(room.requires_approval ? 'Booking request submitted' : 'Room booked successfully')
      setShowBookingDialog(false)
      setSelectedStartSlot(null)
      setSelectedEndSlot(null)
      setBookingTitle('')
      setBookingDescription('')
      loadRoomAndBookings()
    } catch (error) {
      console.error('Error booking room:', error)
      toast.error('Failed to book room')
    } finally {
      setBooking(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentMemberId,
        })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled')
      loadRoomAndBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    }
  }

  const isSlotSelected = (time: string) => {
    if (!selectedStartSlot) return false
    if (!selectedEndSlot) return time === selectedStartSlot

    return time >= selectedStartSlot && time <= selectedEndSlot
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!room) {
    return null
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/c/${communityId}/office/meeting-rooms`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {room.description && (
            <p className="text-muted-foreground text-sm">{room.description}</p>
          )}
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room.capacity} people
        </Badge>
      </div>

      {/* Room Info */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Equipment */}
          {room.equipment && room.equipment.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Equipment</h3>
              <div className="flex flex-wrap gap-2">
                {room.equipment.map((eq) => {
                  const Icon = equipmentIcons[eq] || Tv
                  return (
                    <div
                      key={eq}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2 py-1 rounded"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{equipmentLabels[eq] || eq}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity] || Coffee
                  return (
                    <div
                      key={amenity}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2 py-1 rounded"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{amenityLabels[amenity] || amenity}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Booking Rules */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Min: {room.min_booking_minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Max: {room.max_booking_minutes / 60} hours</span>
          </div>
          {room.requires_approval && (
            <div className="flex items-center gap-1 text-orange-600">
              <Info className="h-4 w-4" />
              <span>Requires approval</span>
            </div>
          )}
        </div>
      </Card>

      {/* Date Navigation */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(-1)}
            disabled={selectedDate <= new Date(new Date().toISOString().split('T')[0])}
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

      {/* Time Slots */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Select Time Slot</h3>
          {selectedStartSlot && !selectedEndSlot && (
            <p className="text-sm text-muted-foreground">
              Click another slot to set end time
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {timeSlots.map((slot) => {
            const isSelected = isSlotSelected(slot.time)
            const isMyBooking = slot.booking?.member_id === currentMemberId

            return (
              <button
                key={slot.time}
                onClick={() => handleSlotClick(slot)}
                disabled={!slot.isAvailable && !isMyBooking}
                className={`
                  p-2 text-xs rounded border transition-all
                  ${isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : slot.isAvailable
                      ? 'bg-background hover:bg-muted border-border hover:border-primary/50'
                      : isMyBooking
                        ? 'bg-primary/20 border-primary/50 text-primary cursor-pointer'
                        : 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
                title={slot.booking ? `Booked: ${slot.booking.title}` : slot.label}
              >
                <div className="font-medium">{slot.label}</div>
                {slot.booking && (
                  <div className="truncate text-[10px] opacity-75">
                    {slot.booking.title}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Range Info */}
        {selectedStartSlot && selectedEndSlot && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedStartSlot} - {(() => {
                  const [h, m] = selectedEndSlot.split(':').map(Number)
                  let newH = h
                  let newM = m + 30
                  if (newM >= 60) { newH++; newM = 0 }
                  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
                })()}
              </p>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const [sh, sm] = selectedStartSlot.split(':').map(Number)
                  const [eh, em] = selectedEndSlot.split(':').map(Number)
                  const startMins = sh * 60 + sm
                  const endMins = eh * 60 + em + 30
                  const duration = endMins - startMins
                  return `${Math.floor(duration / 60)}h ${duration % 60}m`
                })()}
              </p>
            </div>
            <Button onClick={() => setShowBookingDialog(true)}>
              <Check className="h-4 w-4 mr-1" />
              Book
            </Button>
          </div>
        )}
      </Card>

      {/* My Bookings for This Day */}
      {bookings.filter((b) => b.member_id === currentMemberId).length > 0 && (
        <Card className="p-4 mt-6">
          <h3 className="font-medium mb-3">Your Bookings Today</h3>
          <div className="space-y-2">
            {bookings
              .filter((b) => b.member_id === currentMemberId)
              .map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {new Date(b.end_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>
                      {b.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelBooking(b.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book {room.name}</DialogTitle>
            <DialogDescription>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {' • '}
              {selectedStartSlot} - {selectedEndSlot && (() => {
                const [h, m] = selectedEndSlot.split(':').map(Number)
                let newH = h
                let newM = m + 30
                if (newM >= 60) { newH++; newM = 0 }
                return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                placeholder="e.g., Team Standup, Client Call"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={bookingDescription}
                onChange={(e) => setBookingDescription(e.target.value)}
                placeholder="Add any notes about the meeting..."
                rows={3}
              />
            </div>

            {room.requires_approval && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg text-sm">
                <Info className="h-4 w-4 text-orange-600" />
                <span>This room requires admin approval. Your booking will be pending until approved.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookRoom} disabled={booking || !bookingTitle.trim()}>
              {booking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {room.requires_approval ? 'Submit Request' : 'Book Room'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
