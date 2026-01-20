'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Calendar,
  Loader2,
  CalendarCheck,
  Wrench,
  PartyPopper,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const eventTypes = [
  { value: 'event', label: 'Event', icon: Calendar },
  { value: 'meeting', label: 'Meeting', icon: CalendarCheck },
  { value: 'social', label: 'Social', icon: PartyPopper },
  { value: 'workshop', label: 'Workshop', icon: GraduationCap },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
]

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#14B8A6', label: 'Teal' },
]

export default function NewEventPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('event')
  const [color, setColor] = useState('#3B82F6')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [rsvpEnabled, setRsvpEnabled] = useState(true)
  const [maxAttendees, setMaxAttendees] = useState('')
  const [status, setStatus] = useState<'draft' | 'scheduled'>('scheduled')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!startDate) {
      toast.error('Please select a start date')
      return
    }

    if (!endDate) {
      toast.error('Please select an end date')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in')
        return
      }

      // Get member ID
      const { data: member } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
        toast.error('Admin access required')
        return
      }

      // Build datetime strings
      const startsAt = allDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime}:00`
      const endsAt = allDay
        ? `${endDate}T23:59:59`
        : `${endDate}T${endTime}:00`

      // Create event
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          community_id: communityId,
          organizer_id: member.id,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: allDay,
          type,
          color,
          rsvp_enabled: rsvpEnabled,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          status,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Event created successfully')
      router.push(`/c/${communityId}/calendar/${event.id}`)
    } catch (err) {
      console.error('Failed to create event:', err)
      toast.error('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set default dates
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!startDate) setStartDate(today)
  if (!endDate) setEndDate(today)

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/calendar`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Calendar
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
        <p className="text-muted-foreground mt-1">
          Schedule a new community event
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Community BBQ"
              required
            />
          </div>

          {/* Type and Color */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>All Day Event</Label>
              <p className="text-sm text-muted-foreground">
                Event spans the entire day
              </p>
            </div>
            <Switch checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {/* Date and Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Community Center, Room 101"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event..."
              rows={5}
            />
          </div>

          {/* RSVP Settings */}
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="font-semibold">RSVP Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable RSVP</Label>
                <p className="text-sm text-muted-foreground">
                  Allow members to respond to this event
                </p>
              </div>
              <Switch checked={rsvpEnabled} onCheckedChange={setRsvpEnabled} />
            </div>

            {rsvpEnabled && (
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Maximum Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="border-t border-border pt-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'scheduled')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {status === 'draft'
                  ? 'Draft events are only visible to admins'
                  : 'Published events are visible to all members'}
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Event
          </Button>
        </div>
      </form>
    </div>
  )
}
