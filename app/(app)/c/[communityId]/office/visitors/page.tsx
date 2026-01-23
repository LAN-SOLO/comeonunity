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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  UserCheck,
  Calendar,
  Loader2,
  Plus,
  Clock,
  Building2,
  Mail,
  Phone,
  Briefcase,
  LogIn,
  LogOut,
  X,
  Check,
  Wifi,
  FileCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Visitor, VisitorStatus, MeetingRoom } from '@/lib/types/office'

interface VisitorWithHost extends Visitor {
  host: {
    id: string
    display_name: string | null
  }
  meeting_room?: {
    id: string
    name: string
  } | null
}

const statusConfig: Record<VisitorStatus, { label: string; color: string; bgColor: string }> = {
  expected: { label: 'Expected', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  checked_in: { label: 'Checked In', color: 'text-green-600', bgColor: 'bg-green-500' },
  checked_out: { label: 'Checked Out', color: 'text-gray-600', bgColor: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-500' },
  no_show: { label: 'No Show', color: 'text-orange-600', bgColor: 'bg-orange-500' },
}

export default function VisitorsPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<VisitorWithHost[]>([])
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Registration dialog state
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visitor_company: '',
    expected_arrival: '',
    expected_departure: '',
    purpose: '',
    meeting_room_id: '',
    notes: '',
  })

  // Check-in dialog state
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithHost | null>(null)
  const [badgeNumber, setBadgeNumber] = useState('')
  const [wifiAccess, setWifiAccess] = useState(false)
  const [ndaSigned, setNdaSigned] = useState(false)
  const [processing, setProcessing] = useState(false)

  const dateStr = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadVisitors()
  }, [dateStr])

  const loadVisitors = async () => {
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

      // Get visitors for selected date
      const { data: visitorData, error: visitorError } = await supabase
        .from('visitors')
        .select(`
          *,
          host:community_members!visitors_host_member_id_fkey(id, display_name),
          meeting_room:meeting_rooms(id, name)
        `)
        .eq('community_id', communityId)
        .eq('visit_date', dateStr)
        .order('expected_arrival', { ascending: true, nullsFirst: false })

      if (visitorError) throw visitorError

      setVisitors(visitorData || [])

      // Get meeting rooms for registration form
      const { data: roomData } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('name')

      setMeetingRooms(roomData || [])
    } catch (error) {
      console.error('Error loading visitors:', error)
      toast.error('Failed to load visitors')
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleRegister = async () => {
    if (!formData.visitor_name.trim() || !currentMemberId) {
      toast.error('Visitor name is required')
      return
    }

    setRegistering(true)
    try {
      const { error } = await supabase.from('visitors').insert({
        community_id: communityId,
        host_member_id: currentMemberId,
        visitor_name: formData.visitor_name.trim(),
        visitor_email: formData.visitor_email.trim() || null,
        visitor_phone: formData.visitor_phone.trim() || null,
        visitor_company: formData.visitor_company.trim() || null,
        visit_date: dateStr,
        expected_arrival: formData.expected_arrival || null,
        expected_departure: formData.expected_departure || null,
        purpose: formData.purpose.trim() || null,
        meeting_room_id: formData.meeting_room_id || null,
        notes: formData.notes.trim() || null,
        status: 'expected',
      })

      if (error) throw error

      toast.success('Visitor registered successfully')
      setShowRegisterDialog(false)
      setFormData({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visitor_company: '',
        expected_arrival: '',
        expected_departure: '',
        purpose: '',
        meeting_room_id: '',
        notes: '',
      })
      loadVisitors()
    } catch (error) {
      console.error('Error registering visitor:', error)
      toast.error('Failed to register visitor')
    } finally {
      setRegistering(false)
    }
  }

  const handleCheckIn = async () => {
    if (!selectedVisitor) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          status: 'checked_in',
          check_in_at: new Date().toISOString(),
          checked_in_by: currentMemberId,
          badge_number: badgeNumber.trim() || null,
          wifi_access_granted: wifiAccess,
          nda_signed: ndaSigned,
          nda_signed_at: ndaSigned ? new Date().toISOString() : null,
        })
        .eq('id', selectedVisitor.id)

      if (error) throw error

      toast.success(`${selectedVisitor.visitor_name} checked in`)
      setShowCheckInDialog(false)
      setSelectedVisitor(null)
      setBadgeNumber('')
      setWifiAccess(false)
      setNdaSigned(false)
      loadVisitors()
    } catch (error) {
      console.error('Error checking in visitor:', error)
      toast.error('Failed to check in visitor')
    } finally {
      setProcessing(false)
    }
  }

  const handleCheckOut = async (visitor: VisitorWithHost) => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          status: 'checked_out',
          check_out_at: new Date().toISOString(),
        })
        .eq('id', visitor.id)

      if (error) throw error

      toast.success(`${visitor.visitor_name} checked out`)
      loadVisitors()
    } catch (error) {
      console.error('Error checking out visitor:', error)
      toast.error('Failed to check out visitor')
    }
  }

  const handleCancel = async (visitor: VisitorWithHost) => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({ status: 'cancelled' })
        .eq('id', visitor.id)

      if (error) throw error

      toast.success('Visit cancelled')
      loadVisitors()
    } catch (error) {
      console.error('Error cancelling visit:', error)
      toast.error('Failed to cancel visit')
    }
  }

  const openCheckInDialog = (visitor: VisitorWithHost) => {
    setSelectedVisitor(visitor)
    setBadgeNumber('')
    setWifiAccess(false)
    setNdaSigned(false)
    setShowCheckInDialog(true)
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]

  // Stats
  const expectedCount = visitors.filter((v) => v.status === 'expected').length
  const checkedInCount = visitors.filter((v) => v.status === 'checked_in').length
  const checkedOutCount = visitors.filter((v) => v.status === 'checked_out').length

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
            <UserCheck className="h-6 w-6" />
            Visitors
          </h1>
          <p className="text-muted-foreground text-sm">
            Register and manage visitor access
          </p>
        </div>
        <Button onClick={() => setShowRegisterDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Register Visitor
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(-1)}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{expectedCount}</div>
          <div className="text-sm text-muted-foreground">Expected</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
          <div className="text-sm text-muted-foreground">Checked In</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{checkedOutCount}</div>
          <div className="text-sm text-muted-foreground">Checked Out</div>
        </Card>
      </div>

      {/* Visitor List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visitors.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Visitors</h3>
          <p className="text-muted-foreground mb-4">
            No visitors registered for this date.
          </p>
          <Button onClick={() => setShowRegisterDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Register First Visitor
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {visitors.map((visitor) => {
            const status = statusConfig[visitor.status]
            const isMyVisitor = visitor.host_member_id === currentMemberId
            const canManage = isMyVisitor || isAdmin

            return (
              <Card key={visitor.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar/Initial */}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-medium ${status.bgColor}`}>
                    {visitor.visitor_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{visitor.visitor_name}</h3>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {visitor.visitor_company && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {visitor.visitor_company}
                        </span>
                      )}
                      {visitor.expected_arrival && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {visitor.expected_arrival}
                          {visitor.expected_departure && ` - ${visitor.expected_departure}`}
                        </span>
                      )}
                      {visitor.meeting_room && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {visitor.meeting_room.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      {visitor.visitor_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {visitor.visitor_email}
                        </span>
                      )}
                      {visitor.visitor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {visitor.visitor_phone}
                        </span>
                      )}
                    </div>

                    {visitor.purpose && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Purpose:</span> {visitor.purpose}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Host: {visitor.host?.display_name || 'Unknown'}
                    </p>

                    {/* Status indicators */}
                    {visitor.status === 'checked_in' && (
                      <div className="flex gap-2 mt-2">
                        {visitor.badge_number && (
                          <Badge variant="outline" className="text-xs">
                            Badge: {visitor.badge_number}
                          </Badge>
                        )}
                        {visitor.wifi_access_granted && (
                          <Badge variant="outline" className="text-xs">
                            <Wifi className="h-3 w-3 mr-1" />
                            WiFi
                          </Badge>
                        )}
                        {visitor.nda_signed && (
                          <Badge variant="outline" className="text-xs">
                            <FileCheck className="h-3 w-3 mr-1" />
                            NDA
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex gap-2">
                      {visitor.status === 'expected' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openCheckInDialog(visitor)}
                          >
                            <LogIn className="h-4 w-4 mr-1" />
                            Check In
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancel(visitor)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {visitor.status === 'checked_in' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(visitor)}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Check Out
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Register Visitor Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Visitor</DialogTitle>
            <DialogDescription>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Visitor Name *</Label>
              <Input
                id="name"
                value={formData.visitor_name}
                onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.visitor_email}
                  onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                  placeholder="visitor@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.visitor_phone}
                  onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.visitor_company}
                onChange={(e) => setFormData({ ...formData, visitor_company: e.target.value })}
                placeholder="Company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrival">Expected Arrival</Label>
                <Input
                  id="arrival"
                  type="time"
                  value={formData.expected_arrival}
                  onChange={(e) => setFormData({ ...formData, expected_arrival: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departure">Expected Departure</Label>
                <Input
                  id="departure"
                  type="time"
                  value={formData.expected_departure}
                  onChange={(e) => setFormData({ ...formData, expected_departure: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Meeting, Interview, Delivery"
              />
            </div>

            {meetingRooms.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="room">Meeting Room</Label>
                <Select
                  value={formData.meeting_room_id}
                  onValueChange={(value) => setFormData({ ...formData, meeting_room_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No room</SelectItem>
                    {meetingRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.capacity} people)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registering || !formData.visitor_name.trim()}>
              {registering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Registering...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Register Visitor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-In Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Visitor</DialogTitle>
            <DialogDescription>
              {selectedVisitor?.visitor_name}
              {selectedVisitor?.visitor_company && ` from ${selectedVisitor.visitor_company}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="badge">Badge Number</Label>
              <Input
                id="badge"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="e.g., V-001"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span>Grant WiFi Access</span>
                </div>
                <Button
                  variant={wifiAccess ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWifiAccess(!wifiAccess)}
                >
                  {wifiAccess ? <Check className="h-4 w-4" /> : 'Grant'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span>NDA Signed</span>
                </div>
                <Button
                  variant={ndaSigned ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNdaSigned(!ndaSigned)}
                >
                  {ndaSigned ? <Check className="h-4 w-4" /> : 'Confirm'}
                </Button>
              </div>
            </div>

            {selectedVisitor?.meeting_room && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Meeting Room:</span>{' '}
                  <span className="font-medium">{selectedVisitor.meeting_room.name}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckIn} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Processing...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-1" />
                  Check In
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
