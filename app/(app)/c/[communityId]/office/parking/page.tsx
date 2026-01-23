'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Car,
  Calendar,
  Loader2,
  Check,
  X,
  Zap,
  Accessibility,
  Bike,
  CircleParking,
  Lock,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ParkingSpot, ParkingBooking, ParkingSpotType } from '@/lib/types/office'

interface ParkingSpotWithBooking extends ParkingSpot {
  booking?: ParkingBooking & {
    member: {
      id: string
      display_name: string | null
    }
  }
  assignee?: {
    id: string
    display_name: string | null
  }
}

const spotTypeConfig: Record<ParkingSpotType, { icon: typeof Car; label: string; color: string }> = {
  standard: { icon: Car, label: 'Standard', color: 'text-blue-600' },
  handicap: { icon: Accessibility, label: 'Accessible', color: 'text-purple-600' },
  ev_charging: { icon: Zap, label: 'EV Charging', color: 'text-green-600' },
  motorcycle: { icon: Bike, label: 'Motorcycle', color: 'text-orange-600' },
  compact: { icon: CircleParking, label: 'Compact', color: 'text-gray-600' },
  reserved: { icon: Lock, label: 'Reserved', color: 'text-red-600' },
}

export default function ParkingPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [spots, setSpots] = useState<ParkingSpotWithBooking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  // Booking dialog state
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotWithBooking | null>(null)
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [booking, setBooking] = useState(false)

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadSpotsAndBookings()
  }, [dateStr])

  const loadSpotsAndBookings = async () => {
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

      // Get all active parking spots with assignee info
      const { data: spotData, error: spotError } = await supabase
        .from('parking_spots')
        .select(`
          *,
          assignee:community_members!parking_spots_assigned_to_fkey(id, display_name)
        `)
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('spot_number')

      if (spotError) throw spotError

      // Get bookings for selected date
      const { data: bookingData } = await supabase
        .from('parking_bookings')
        .select(`
          *,
          member:community_members(id, display_name)
        `)
        .eq('community_id', communityId)
        .eq('booking_date', dateStr)
        .eq('status', 'confirmed')

      // Merge bookings with spots
      const spotsWithBookings = (spotData || []).map((spot) => {
        const spotBooking = bookingData?.find((b) => b.spot_id === spot.id)
        return { ...spot, booking: spotBooking }
      })

      setSpots(spotsWithBookings)
    } catch (error) {
      console.error('Error loading parking spots:', error)
      toast.error('Failed to load parking spots')
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleBookSpot = (spot: ParkingSpotWithBooking) => {
    setSelectedSpot(spot)
    setVehiclePlate('')
    setVehicleDescription('')
    setShowBookingDialog(true)
  }

  const confirmBooking = async () => {
    if (!selectedSpot || !currentMemberId) return

    setBooking(true)
    try {
      const { error } = await supabase.from('parking_bookings').insert({
        spot_id: selectedSpot.id,
        community_id: communityId,
        member_id: currentMemberId,
        booking_date: dateStr,
        vehicle_plate: vehiclePlate.trim() || null,
        vehicle_description: vehicleDescription.trim() || null,
        status: 'confirmed',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This spot is already booked for this date')
        } else {
          throw error
        }
        return
      }

      toast.success('Parking spot booked successfully')
      setShowBookingDialog(false)
      loadSpotsAndBookings()
    } catch (error) {
      console.error('Error booking spot:', error)
      toast.error('Failed to book parking spot')
    } finally {
      setBooking(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('parking_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled')
      loadSpotsAndBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    }
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]
  const isPast = selectedDate < new Date(new Date().toISOString().split('T')[0])

  // Group spots by location
  const spotsByLocation = spots.reduce<Record<string, ParkingSpotWithBooking[]>>((acc, spot) => {
    const location = spot.location || 'General'
    if (!acc[location]) acc[location] = []
    acc[location].push(spot)
    return acc
  }, {})

  const availableCount = spots.filter((s) => s.is_bookable && !s.booking && !s.is_assigned).length
  const bookedCount = spots.filter((s) => s.booking).length
  const assignedCount = spots.filter((s) => s.is_assigned).length

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
            <Car className="h-6 w-6" />
            Parking
          </h1>
          <p className="text-muted-foreground text-sm">
            Reserve a parking spot for your vehicle
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{availableCount}</div>
          <div className="text-sm text-muted-foreground">Available</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{bookedCount}</div>
          <div className="text-sm text-muted-foreground">Booked Today</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{assignedCount}</div>
          <div className="text-sm text-muted-foreground">Permanently Assigned</div>
        </Card>
      </div>

      {/* Parking Spots */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : spots.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Parking Spots</h3>
          <p className="text-muted-foreground">
            No parking spots have been configured yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(spotsByLocation).map(([location, locationSpots]) => (
            <div key={location}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium">{location}</h2>
                <Badge variant="outline" className="ml-auto">
                  {locationSpots.filter((s) => s.is_bookable && !s.booking && !s.is_assigned).length} available
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {locationSpots.map((spot) => {
                  const typeConfig = spotTypeConfig[spot.type] || spotTypeConfig.standard
                  const Icon = typeConfig.icon
                  const isBooked = !!spot.booking
                  const isMyBooking = spot.booking?.member_id === currentMemberId
                  const isAssigned = spot.is_assigned
                  const isMyAssignment = spot.assigned_to === currentMemberId
                  const canBook = spot.is_bookable && !isBooked && !isAssigned && !isPast

                  return (
                    <Card
                      key={spot.id}
                      className={`p-3 ${
                        isMyBooking || isMyAssignment
                          ? 'border-primary bg-primary/5'
                          : isBooked || isAssigned
                            ? 'bg-muted/30'
                            : canBook
                              ? 'hover:border-primary/50 cursor-pointer'
                              : ''
                      }`}
                      onClick={() => canBook && handleBookSpot(spot)}
                    >
                      {/* Spot Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                          <span className="font-medium">{spot.spot_number}</span>
                        </div>
                        {spot.type !== 'standard' && (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {typeConfig.label}
                          </Badge>
                        )}
                      </div>

                      {/* Status */}
                      {isAssigned ? (
                        <div className="text-xs">
                          <Badge variant="secondary" className="w-full justify-center">
                            <Lock className="h-3 w-3 mr-1" />
                            {isMyAssignment ? 'Your Spot' : 'Assigned'}
                          </Badge>
                          {spot.assignee && !isMyAssignment && (
                            <p className="text-muted-foreground mt-1 truncate">
                              {spot.assignee.display_name}
                            </p>
                          )}
                        </div>
                      ) : isBooked ? (
                        <div className="text-xs">
                          <Badge
                            variant={isMyBooking ? 'default' : 'secondary'}
                            className="w-full justify-center"
                          >
                            {isMyBooking ? 'Your Booking' : 'Booked'}
                          </Badge>
                          {isMyBooking && spot.booking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 h-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelBooking(spot.booking!.id)
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {!isMyBooking && spot.booking?.member && (
                            <p className="text-muted-foreground mt-1 truncate">
                              {spot.booking.member.display_name}
                            </p>
                          )}
                        </div>
                      ) : canBook ? (
                        <Badge variant="outline" className="w-full justify-center text-green-600 border-green-600">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-full justify-center text-muted-foreground">
                          Not Bookable
                        </Badge>
                      )}

                      {/* Daily Rate */}
                      {spot.daily_rate > 0 && canBook && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          €{spot.daily_rate.toFixed(2)}/day
                        </p>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {Object.entries(spotTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2">
            <config.icon className={`h-4 w-4 ${config.color}`} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Parking Spot {selectedSpot?.spot_number}</DialogTitle>
            <DialogDescription>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {selectedSpot?.location && ` • ${selectedSpot.location}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Spot Info */}
            {selectedSpot && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {(() => {
                  const config = spotTypeConfig[selectedSpot.type]
                  const Icon = config.icon
                  return (
                    <>
                      <Icon className={`h-8 w-8 ${config.color}`} />
                      <div>
                        <p className="font-medium">Spot {selectedSpot.spot_number}</p>
                        <p className="text-sm text-muted-foreground">{config.label}</p>
                      </div>
                      {selectedSpot.daily_rate > 0 && (
                        <Badge className="ml-auto">€{selectedSpot.daily_rate.toFixed(2)}/day</Badge>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="plate">License Plate (optional)</Label>
              <Input
                id="plate"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="e.g., M-AB 1234"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Description (optional)</Label>
              <Input
                id="vehicle"
                value={vehicleDescription}
                onChange={(e) => setVehicleDescription(e.target.value)}
                placeholder="e.g., Blue Tesla Model 3"
              />
            </div>

            {selectedSpot?.notes && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Note:</p>
                <p className="text-muted-foreground">{selectedSpot.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={booking}>
              {booking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Book Spot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
