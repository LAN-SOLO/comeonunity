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
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { MeetingRoom, RoomBooking } from '@/lib/types/office'

interface MeetingRoomWithBookings extends MeetingRoom {
  todayBookings: RoomBooking[]
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

export default function MeetingRoomsPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<MeetingRoomWithBookings[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadRoomsAndBookings()
  }, [dateStr])

  const loadRoomsAndBookings = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check membership
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

      // Get all active meeting rooms
      const { data: roomData, error: roomError } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('name')

      if (roomError) throw roomError

      // Get today's bookings for all rooms
      const startOfDay = `${dateStr}T00:00:00`
      const endOfDay = `${dateStr}T23:59:59`

      const { data: bookingData } = await supabase
        .from('room_bookings')
        .select('*')
        .eq('community_id', communityId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .in('status', ['pending', 'confirmed'])
        .order('start_time')

      // Merge bookings with rooms
      const roomsWithBookings = (roomData || []).map((room) => {
        const todayBookings = bookingData?.filter((b) => b.room_id === room.id) || []
        return { ...room, todayBookings }
      })

      setRooms(roomsWithBookings)
    } catch (error) {
      console.error('Error loading rooms:', error)
      toast.error('Failed to load meeting rooms')
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]

  const getNextAvailableSlot = (room: MeetingRoomWithBookings): string | null => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Check from current time (or 8 AM if viewing future date)
    let checkHour = isToday ? Math.max(currentHour, 8) : 8
    let checkMinute = isToday && currentHour >= 8 ? Math.ceil(currentMinute / 30) * 30 : 0

    if (checkMinute >= 60) {
      checkHour++
      checkMinute = 0
    }

    // Check slots until 6 PM
    while (checkHour < 18) {
      const slotStart = `${dateStr}T${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}:00`
      const slotEnd = new Date(new Date(slotStart).getTime() + 30 * 60 * 1000).toISOString()

      const hasConflict = room.todayBookings.some((booking) => {
        const bookingStart = new Date(booking.start_time).getTime()
        const bookingEnd = new Date(booking.end_time).getTime()
        const slotStartTime = new Date(slotStart).getTime()
        const slotEndTime = new Date(slotEnd).getTime()

        return slotStartTime < bookingEnd && slotEndTime > bookingStart
      })

      if (!hasConflict) {
        return `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`
      }

      checkMinute += 30
      if (checkMinute >= 60) {
        checkHour++
        checkMinute = 0
      }
    }

    return null
  }

  const getRoomAvailabilityStatus = (room: MeetingRoomWithBookings): { status: string; color: string } => {
    if (room.todayBookings.length === 0) {
      return { status: 'Available all day', color: 'text-green-600' }
    }

    const nextSlot = getNextAvailableSlot(room)
    if (nextSlot) {
      return { status: `Next: ${nextSlot}`, color: 'text-blue-600' }
    }

    return { status: 'Fully booked', color: 'text-red-600' }
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Meeting Rooms
          </h1>
          <p className="text-muted-foreground text-sm">
            Book a room for your meetings
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

      {/* Room Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rooms.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Meeting Rooms</h3>
          <p className="text-muted-foreground">
            No meeting rooms have been configured yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const availability = getRoomAvailabilityStatus(room)

            return (
              <Card key={room.id} className="overflow-hidden">
                <div className="p-4">
                  {/* Room Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      {room.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {room.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.capacity}
                    </Badge>
                  </div>

                  {/* Equipment */}
                  {room.equipment && room.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {room.equipment.map((eq) => {
                        const Icon = equipmentIcons[eq] || Tv
                        return (
                          <div
                            key={eq}
                            className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                            title={equipmentLabels[eq] || eq}
                          >
                            <Icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{equipmentLabels[eq] || eq}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Amenities */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {room.amenities.map((amenity) => {
                        const Icon = amenityIcons[amenity] || Coffee
                        return (
                          <span key={amenity} title={amenity.replace('_', ' ')}>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Availability Status */}
                  <div className={`flex items-center gap-2 text-sm ${availability.color} mb-3`}>
                    <Clock className="h-4 w-4" />
                    <span>{availability.status}</span>
                  </div>

                  {/* Today's Bookings Preview */}
                  {room.todayBookings.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        {room.todayBookings.length} booking{room.todayBookings.length !== 1 ? 's' : ''} today
                      </p>
                      <div className="flex gap-1 h-2">
                        {/* Time bar visualization */}
                        {Array.from({ length: 10 }, (_, i) => {
                          const hour = 8 + i
                          const hourStr = `${dateStr}T${hour.toString().padStart(2, '0')}:00:00`
                          const hourEnd = `${dateStr}T${(hour + 1).toString().padStart(2, '0')}:00:00`

                          const isBooked = room.todayBookings.some((booking) => {
                            const start = new Date(booking.start_time).getTime()
                            const end = new Date(booking.end_time).getTime()
                            const slotStart = new Date(hourStr).getTime()
                            const slotEnd = new Date(hourEnd).getTime()
                            return start < slotEnd && end > slotStart
                          })

                          return (
                            <div
                              key={i}
                              className={`flex-1 rounded-sm ${isBooked ? 'bg-primary/60' : 'bg-muted'}`}
                              title={`${hour}:00 - ${hour + 1}:00`}
                            />
                          )
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>8AM</span>
                        <span>6PM</span>
                      </div>
                    </div>
                  )}

                  {/* Book Button */}
                  <Link href={`/c/${communityId}/office/meeting-rooms/${room.id}?date=${dateStr}`}>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Book This Room
                    </Button>
                  </Link>
                </div>
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
          <div className="w-3 h-3 rounded-full bg-primary/60" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span>Free Slot</span>
        </div>
      </div>
    </div>
  )
}
