'use client'

import { useState, useEffect, useRef } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2,
  Plus,
  Calendar,
  Monitor,
  Laptop,
  ArrowUpDown,
  Check,
  X,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FloorPlan, Desk, DeskBooking, DeskEquipment } from '@/lib/types/office'

interface DeskWithBooking extends Desk {
  booking?: DeskBooking & {
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

const equipmentOptions: { value: DeskEquipment; label: string }[] = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'dual_monitor', label: 'Dual Monitor' },
  { value: 'docking_station', label: 'Docking Station' },
  { value: 'standing_desk', label: 'Standing Desk' },
  { value: 'ergonomic_chair', label: 'Ergonomic Chair' },
  { value: 'phone', label: 'Phone' },
  { value: 'webcam', label: 'Webcam' },
  { value: 'headset', label: 'Headset' },
]

const equipmentIcons: Record<string, typeof Monitor> = {
  monitor: Monitor,
  dual_monitor: Monitor,
  docking_station: Laptop,
  standing_desk: ArrowUpDown,
}

export default function FloorPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const floorPlanId = params.floorPlanId as string
  const supabase = createClient()

  const containerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [desks, setDesks] = useState<DeskWithBooking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Selected desk state
  const [selectedDesk, setSelectedDesk] = useState<DeskWithBooking | null>(null)
  const [showDeskDialog, setShowDeskDialog] = useState(false)
  const [booking, setBooking] = useState(false)

  // Add desk dialog (admin)
  const [showAddDeskDialog, setShowAddDeskDialog] = useState(false)
  const [addingDesk, setAddingDesk] = useState(false)
  const [newDeskPosition, setNewDeskPosition] = useState({ x: 100, y: 100 })
  const [newDeskForm, setNewDeskForm] = useState({
    name: '',
    desk_number: '',
    equipment: [] as DeskEquipment[],
    is_bookable: true,
  })

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadFloorPlanAndDesks()
  }, [dateStr, floorPlanId])

  const loadFloorPlanAndDesks = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push('/')
        return
      }

      setCurrentMemberId(member.id)
      setIsAdmin(member.role === 'admin' || member.role === 'moderator')

      // Get floor plan
      const { data: planData, error: planError } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .eq('community_id', communityId)
        .single()

      if (planError || !planData) {
        toast.error('Floor plan not found')
        router.push(`/c/${communityId}/office/floor-plans`)
        return
      }

      setFloorPlan(planData)

      // Get desks with assignees
      const { data: deskData, error: deskError } = await supabase
        .from('desks')
        .select(`
          *,
          assignee:community_members!desks_assigned_to_fkey(id, display_name)
        `)
        .eq('floor_plan_id', floorPlanId)
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
        const deskBooking = bookingData?.find((b) => b.desk_id === desk.id)
        return { ...desk, booking: deskBooking }
      })

      setDesks(desksWithBookings)
    } catch (error) {
      console.error('Error loading floor plan:', error)
      toast.error('Failed to load floor plan')
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleDeskClick = (desk: DeskWithBooking) => {
    setSelectedDesk(desk)
    setShowDeskDialog(true)
  }

  const handleBookDesk = async () => {
    if (!selectedDesk || !currentMemberId) return

    setBooking(true)
    try {
      const { error } = await supabase.from('desk_bookings').insert({
        desk_id: selectedDesk.id,
        community_id: communityId,
        member_id: currentMemberId,
        booking_date: dateStr,
        is_full_day: true,
        status: 'confirmed',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This desk is already booked')
        } else {
          throw error
        }
        return
      }

      toast.success('Desk booked successfully')
      setShowDeskDialog(false)
      loadFloorPlanAndDesks()
    } catch (error) {
      console.error('Error booking desk:', error)
      toast.error('Failed to book desk')
    } finally {
      setBooking(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!selectedDesk?.booking) return

    try {
      const { error } = await supabase
        .from('desk_bookings')
        .update({ status: 'cancelled' })
        .eq('id', selectedDesk.booking.id)

      if (error) throw error

      toast.success('Booking cancelled')
      setShowDeskDialog(false)
      loadFloorPlanAndDesks()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    }
  }

  const handleAddDesk = async () => {
    if (!newDeskForm.name.trim()) {
      toast.error('Desk name is required')
      return
    }

    setAddingDesk(true)
    try {
      const { error } = await supabase.from('desks').insert({
        floor_plan_id: floorPlanId,
        community_id: communityId,
        name: newDeskForm.name.trim(),
        desk_number: newDeskForm.desk_number.trim() || null,
        position_x: newDeskPosition.x,
        position_y: newDeskPosition.y,
        width: 60,
        height: 40,
        equipment: newDeskForm.equipment,
        is_bookable: newDeskForm.is_bookable,
        status: 'available',
      })

      if (error) throw error

      toast.success('Desk added')
      setShowAddDeskDialog(false)
      setNewDeskForm({ name: '', desk_number: '', equipment: [], is_bookable: true })
      loadFloorPlanAndDesks()
    } catch (error) {
      console.error('Error adding desk:', error)
      toast.error('Failed to add desk')
    } finally {
      setAddingDesk(false)
    }
  }

  const handleDeleteDesk = async (desk: DeskWithBooking) => {
    if (!confirm(`Delete desk "${desk.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('desks')
        .delete()
        .eq('id', desk.id)

      if (error) throw error

      toast.success('Desk deleted')
      setShowDeskDialog(false)
      loadFloorPlanAndDesks()
    } catch (error) {
      console.error('Error deleting desk:', error)
      toast.error('Failed to delete desk')
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdmin) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / zoom)
    const y = Math.round((e.clientY - rect.top) / zoom)

    setNewDeskPosition({ x, y })
    setShowAddDeskDialog(true)
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]
  const isPast = selectedDate < new Date(new Date().toISOString().split('T')[0])

  const getDeskColor = (desk: DeskWithBooking) => {
    if (desk.status === 'maintenance') return 'bg-gray-400'
    if (desk.is_assigned) return 'bg-purple-500'
    if (desk.booking) {
      if (desk.booking.member_id === currentMemberId) return 'bg-primary'
      return 'bg-orange-500'
    }
    if (!desk.is_bookable) return 'bg-gray-300'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!floorPlan) return null

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/c/${communityId}/office/floor-plans`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{floorPlan.name}</h1>
          <p className="text-muted-foreground text-sm">
            Floor {floorPlan.floor_number} • {desks.length} desks
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

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          disabled={zoom >= 2}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <span className="text-sm text-muted-foreground ml-4">
            Click on empty area to add desk
          </span>
        )}
      </div>

      {/* Floor Plan Canvas */}
      <Card className="overflow-auto mb-6">
        <div
          ref={containerRef}
          className="relative bg-muted/30"
          style={{
            width: floorPlan.width * zoom,
            height: floorPlan.height * zoom,
            minWidth: '100%',
            backgroundImage: floorPlan.image_url ? `url(${floorPlan.image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={handleCanvasClick}
        >
          {/* Grid overlay */}
          {!floorPlan.image_url && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
              }}
            />
          )}

          {/* Desks */}
          {desks.map((desk) => (
            <div
              key={desk.id}
              className={`absolute rounded cursor-pointer transition-all hover:ring-2 hover:ring-primary ${getDeskColor(desk)}`}
              style={{
                left: desk.position_x * zoom,
                top: desk.position_y * zoom,
                width: desk.width * zoom,
                height: desk.height * zoom,
                transform: `rotate(${desk.rotation}deg)`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleDeskClick(desk)
              }}
              title={`${desk.name}${desk.booking ? ` - ${desk.booking.member?.display_name}` : ''}`}
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium overflow-hidden"
                style={{ transform: `rotate(-${desk.rotation}deg)` }}
              >
                {desk.desk_number || desk.name.charAt(0)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span className="text-muted-foreground">Your Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-muted-foreground">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500" />
          <span className="text-muted-foreground">Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
      </div>

      {/* Desk Detail Dialog */}
      <Dialog open={showDeskDialog} onOpenChange={setShowDeskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDesk?.name}</DialogTitle>
            <DialogDescription>
              {selectedDesk?.desk_number && `#${selectedDesk.desk_number} • `}
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedDesk && (
            <div className="py-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {selectedDesk.is_assigned ? (
                  <Badge variant="secondary">
                    Assigned to {selectedDesk.assignee?.display_name || 'Unknown'}
                  </Badge>
                ) : selectedDesk.booking ? (
                  <Badge variant={selectedDesk.booking.member_id === currentMemberId ? 'default' : 'secondary'}>
                    {selectedDesk.booking.member_id === currentMemberId
                      ? 'Your Booking'
                      : `Booked by ${selectedDesk.booking.member?.display_name}`}
                  </Badge>
                ) : selectedDesk.status === 'maintenance' ? (
                  <Badge variant="outline">Maintenance</Badge>
                ) : selectedDesk.is_bookable ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Bookable</Badge>
                )}
              </div>

              {/* Equipment */}
              {selectedDesk.equipment && selectedDesk.equipment.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Equipment:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedDesk.equipment.map((eq) => {
                      const Icon = equipmentIcons[eq] || Monitor
                      return (
                        <Badge key={eq} variant="outline" className="text-xs">
                          <Icon className="h-3 w-3 mr-1" />
                          {equipmentOptions.find((o) => o.value === eq)?.label || eq}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {isAdmin && selectedDesk && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive mr-auto"
                onClick={() => handleDeleteDesk(selectedDesk)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}

            <Button variant="outline" onClick={() => setShowDeskDialog(false)}>
              Close
            </Button>

            {selectedDesk?.booking?.member_id === currentMemberId && !isPast && (
              <Button variant="destructive" onClick={handleCancelBooking}>
                <X className="h-4 w-4 mr-1" />
                Cancel Booking
              </Button>
            )}

            {selectedDesk &&
              !selectedDesk.booking &&
              !selectedDesk.is_assigned &&
              selectedDesk.is_bookable &&
              selectedDesk.status !== 'maintenance' &&
              !isPast && (
                <Button onClick={handleBookDesk} disabled={booking}>
                  {booking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Book This Desk
                    </>
                  )}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Desk Dialog (Admin) */}
      <Dialog open={showAddDeskDialog} onOpenChange={setShowAddDeskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Desk</DialogTitle>
            <DialogDescription>
              Position: ({newDeskPosition.x}, {newDeskPosition.y})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="desk-name">Desk Name *</Label>
              <Input
                id="desk-name"
                value={newDeskForm.name}
                onChange={(e) => setNewDeskForm({ ...newDeskForm, name: e.target.value })}
                placeholder="e.g., Desk A1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desk-number">Desk Number</Label>
              <Input
                id="desk-number"
                value={newDeskForm.desk_number}
                onChange={(e) => setNewDeskForm({ ...newDeskForm, desk_number: e.target.value })}
                placeholder="e.g., A1"
              />
            </div>

            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((eq) => (
                  <Badge
                    key={eq.value}
                    variant={newDeskForm.equipment.includes(eq.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newEquipment = newDeskForm.equipment.includes(eq.value)
                        ? newDeskForm.equipment.filter((e) => e !== eq.value)
                        : [...newDeskForm.equipment, eq.value]
                      setNewDeskForm({ ...newDeskForm, equipment: newEquipment })
                    }}
                  >
                    {eq.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-bookable"
                checked={newDeskForm.is_bookable}
                onChange={(e) => setNewDeskForm({ ...newDeskForm, is_bookable: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is-bookable">Bookable by members</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDesk} disabled={addingDesk || !newDeskForm.name.trim()}>
              {addingDesk ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Desk
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
