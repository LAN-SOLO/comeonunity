'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventCard } from '@/components/events/event-card'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Plus,
  Loader2,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from 'date-fns'

interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  type: string
  color: string | null
  cover_image_url: string | null
  max_attendees: number | null
  status: string
  organizer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
  rsvp_count?: number
  user_rsvp?: string | null
}

export default function CalendarPage() {
  const params = useParams()
  const communitySlug = params.communityId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug])

  useEffect(() => {
    if (communityId) {
      fetchEvents()
      checkAdminStatus()
    }
  }, [communityId, currentMonth])

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

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    setIsAdmin(member?.role === 'admin' || member?.role === 'moderator')
  }

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get member ID for RSVP check
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      // Get events for the month (with some buffer for multi-day events)
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const rangeStart = startOfWeek(monthStart)
      const rangeEnd = endOfWeek(monthEnd)

      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          starts_at,
          ends_at,
          all_day,
          type,
          color,
          cover_image_url,
          max_attendees,
          status,
          organizer:organizer_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .neq('status', 'draft')
        .gte('ends_at', rangeStart.toISOString())
        .lte('starts_at', rangeEnd.toISOString())
        .order('starts_at', { ascending: true })

      if (error) throw error

      // Get RSVP counts and user's RSVP status
      const eventsWithRsvp = await Promise.all(
        (eventsData || []).map(async (event) => {
          const [countResult, userRsvp] = await Promise.all([
            supabase
              .from('event_rsvps')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'going'),
            member
              ? supabase
                  .from('event_rsvps')
                  .select('status')
                  .eq('event_id', event.id)
                  .eq('member_id', member.id)
                  .single()
              : Promise.resolve({ data: null }),
          ])

          return {
            ...event,
            organizer: Array.isArray(event.organizer)
              ? event.organizer[0] || null
              : event.organizer as Event['organizer'],
            rsvp_count: countResult.count || 0,
            user_rsvp: userRsvp.data?.status || null,
          }
        })
      )

      setEvents(eventsWithRsvp)
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.starts_at)
      const eventEnd = parseISO(event.ends_at)
      return (
        isSameDay(eventStart, day) ||
        isSameDay(eventEnd, day) ||
        isWithinInterval(day, { start: eventStart, end: eventEnd })
      )
    })
  }

  // Upcoming events for list view
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    return events
      .filter((event) => parseISO(event.ends_at) >= today && event.status !== 'cancelled')
      .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime())
  }, [events])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Community events and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
            <TabsList>
              <TabsTrigger value="calendar">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {isAdmin && (
            <Button asChild>
              <Link href={`/c/${communitySlug}/admin/events/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : view === 'calendar' ? (
        <Card className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={index}
                  className={`bg-card min-h-[100px] p-1 ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  }`}
                >
                  <div
                    className={`text-sm p-1 ${
                      isCurrentDay
                        ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        communityId={communitySlug}
                        variant="calendar"
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No upcoming events</h3>
              <p className="text-muted-foreground mb-4">
                There are no events scheduled yet
              </p>
              {isAdmin && (
                <Button asChild>
                  <Link href={`/c/${communitySlug}/admin/events/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  communityId={communitySlug}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming events sidebar for calendar view */}
      {view === 'calendar' && upcomingEvents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
          <Card className="divide-y divide-border">
            {upcomingEvents.slice(0, 5).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                communityId={communitySlug}
                variant="compact"
              />
            ))}
          </Card>
          {upcomingEvents.length > 5 && (
            <Button variant="ghost" className="w-full mt-2" onClick={() => setView('list')}>
              View all {upcomingEvents.length} events
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
