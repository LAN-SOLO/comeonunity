import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Edit,
  CalendarCheck,
  Wrench,
  PartyPopper,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { RsvpButtons } from '@/components/events/rsvp-buttons'
import { ShareEventButton } from '@/components/events/share-event-button'

interface Props {
  params: Promise<{ communityId: string; eventId: string }>
}

// Generate metadata for share previews
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId: communitySlug, eventId } = await params
  const supabase = await createClient()

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

  let communityQuery = supabase
    .from('communities')
    .select('id, name, slug')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
  } else {
    communityQuery = communityQuery.eq('slug', communitySlug)
  }

  const { data: community } = await communityQuery.single()
  if (!community) {
    return { title: 'Event Not Found' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('title, description, cover_image_url, starts_at, location, status')
    .eq('id', eventId)
    .eq('community_id', community.id)
    .single()

  if (!event || event.status === 'draft') {
    return { title: 'Event Not Found' }
  }

  const title = `${event.title} - ${community.name}`
  const eventDate = format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')
  const description = event.description
    ? `${eventDate}${event.location ? ` at ${event.location}` : ''} - ${event.description.slice(0, 150)}`
    : `${eventDate}${event.location ? ` at ${event.location}` : ''}`

  return {
    title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'website',
      images: event.cover_image_url ? [{ url: event.cover_image_url }] : [],
    },
    twitter: {
      card: event.cover_image_url ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
      images: event.cover_image_url ? [event.cover_image_url] : [],
    },
  }
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  event: Calendar,
  meeting: CalendarCheck,
  maintenance: Wrench,
  social: PartyPopper,
  workshop: GraduationCap,
  other: MoreHorizontal,
}

const typeLabels: Record<string, string> = {
  event: 'Event',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  social: 'Social',
  workshop: 'Workshop',
  other: 'Other',
}

export default async function EventDetailPage({ params }: Props) {
  const { communityId: communitySlug, eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

  // Fetch community by slug or id
  let communityQuery = supabase
    .from('communities')
    .select('id, slug, name')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
  } else {
    communityQuery = communityQuery.eq('slug', communitySlug)
  }

  const { data: community } = await communityQuery.single()

  if (!community) {
    notFound()
  }

  // Redirect if accessed by ID instead of slug
  if (communitySlug !== community.slug && communitySlug === community.id) {
    redirect(`/c/${community.slug}/calendar/${eventId}`)
  }

  // Check membership and get role (only if user is logged in)
  let member = null
  let isAdmin = false
  if (user) {
    const { data: memberData } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
    member = memberData
    isAdmin = member?.role === 'admin' || member?.role === 'moderator'
  }

  // Get event
  const { data: event } = await supabase
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
      rsvp_enabled,
      rsvp_deadline,
      status,
      cancelled_reason,
      created_at,
      updated_at,
      organizer:organizer_id (
        id,
        display_name,
        avatar_url,
        role
      )
    `)
    .eq('id', eventId)
    .eq('community_id', community.id)
    .single()

  if (!event) {
    notFound()
  }

  // Only show draft events to admins
  if (event.status === 'draft' && !isAdmin) {
    notFound()
  }

  // Draft events require authentication
  if (event.status === 'draft' && !user) {
    redirect('/login')
  }

  // Get RSVP data (only for authenticated members - RLS requires auth)
  let rsvpCount = 0
  let userRsvp = null
  let attendees: any[] = []

  if (member) {
    // Get RSVP count
    const { count } = await supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'going')
    rsvpCount = count || 0

    // Get user's RSVP
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('status, guests, note')
      .eq('event_id', eventId)
      .eq('member_id', member.id)
      .maybeSingle()
    userRsvp = rsvpData

    // Get attendees list
    const { data: attendeesData } = await supabase
      .from('event_rsvps')
      .select(`
        status,
        guests,
        member:member_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going')
      .limit(20)

    attendees = attendeesData || []
  }

  const organizer = event.organizer as any
  const organizerName = organizer?.display_name || 'Unknown'
  const organizerInitials = organizerName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const Icon = typeIcons[event.type] || typeIcons.event
  const startDate = new Date(event.starts_at)
  const endDate = new Date(event.ends_at)
  const isPastEvent = isPast(endDate)
  const isCancelled = event.status === 'cancelled'

  // Check if RSVP is still open (only for members)
  const canRsvp = member && event.rsvp_enabled &&
    !isPastEvent &&
    !isCancelled &&
    (!event.rsvp_deadline || new Date(event.rsvp_deadline) > new Date()) &&
    (!event.max_attendees || (rsvpCount || 0) < event.max_attendees || userRsvp?.status === 'going')

  const isPublicView = !user || !member

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button - only for members */}
      {member && (
        <div className="mb-6">
          <Link
            href={`/c/${community.slug}/calendar`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Link>
        </div>
      )}

      {/* Public view banner */}
      {isPublicView && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            This event is from <strong>{community.name}</strong> community.
          </p>
          <div className="flex gap-2">
            {!user ? (
              <>
                <Button size="sm" asChild>
                  <Link href={`/login?next=/c/${community.slug}/calendar/${eventId}`}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/signup?next=/c/${community.slug}`}>
                    Join Community
                  </Link>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link href={`/c/${community.slug}`}>
                  View Community
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cover image */}
      {event.cover_image_url && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge
                style={{ backgroundColor: `${event.color || '#3B82F6'}20`, color: event.color || '#3B82F6' }}
              >
                <Icon className="h-3 w-3 mr-1" />
                {typeLabels[event.type] || 'Event'}
              </Badge>
              {isCancelled && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
              {isPastEvent && !isCancelled && (
                <Badge variant="secondary">Past Event</Badge>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <h1 className={`text-3xl font-bold tracking-tight ${isCancelled ? 'line-through' : ''}`}>
                {event.title}
              </h1>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/c/${community.slug}/admin/events/${eventId}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Cancelled reason */}
          {isCancelled && event.cancelled_reason && (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <p className="text-sm font-medium text-destructive">Event Cancelled</p>
              <p className="text-sm text-muted-foreground mt-1">{event.cancelled_reason}</p>
            </Card>
          )}

          {/* Event details */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Event Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(startDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  {!event.all_day && (
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </p>
                  )}
                  {event.all_day && (
                    <p className="text-sm text-muted-foreground">All day event</p>
                  )}
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Attendees</p>
                  <p className="text-sm text-muted-foreground">
                    {rsvpCount || 0} going
                    {event.max_attendees && ` (${event.max_attendees} max)`}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          {event.description && (
            <Card className="p-6">
              <h2 className="font-semibold mb-4">About This Event</h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {event.description}
                </div>
              </div>
            </Card>
          )}

          {/* Organizer */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Organized By</h2>
            {member ? (
              <Link href={`/c/${community.slug}/members/${organizer?.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={organizer?.avatar_url || undefined} />
                    <AvatarFallback>{organizerInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{organizerName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {organizer?.role || 'Member'}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={organizer?.avatar_url || undefined} />
                  <AvatarFallback>{organizerInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{organizerName}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {organizer?.role || 'Member'}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* RSVP Card */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Are you going?</h2>
            {member ? (
              <>
                <RsvpButtons
                  eventId={eventId}
                  communityId={community.slug}
                  currentStatus={userRsvp?.status}
                  canRsvp={canRsvp}
                  isPastEvent={isPastEvent}
                  isCancelled={isCancelled}
                />
                {event.rsvp_deadline && !isPastEvent && !isCancelled && (
                  <p className="text-xs text-muted-foreground mt-3">
                    RSVP by {format(new Date(event.rsvp_deadline), 'MMM d, yyyy')}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Sign in to RSVP to this event
                </p>
                <Button size="sm" asChild>
                  <Link href={`/login?next=/c/${community.slug}/calendar/${eventId}`}>
                    Sign in
                  </Link>
                </Button>
              </div>
            )}
          </Card>

          {/* Attendees */}
          {attendees && attendees.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-4">
                Who&apos;s Going ({rsvpCount || 0})
              </h2>
              <div className="space-y-3">
                {attendees.map((rsvp) => {
                  const attendee = rsvp.member as any
                  const name = attendee?.display_name || 'Unknown'
                  const initials = name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  const content = (
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${member ? 'hover:bg-muted/50' : ''} transition-colors`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendee?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{name}</span>
                      {rsvp.guests > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{rsvp.guests}
                        </Badge>
                      )}
                    </div>
                  )

                  return member ? (
                    <Link
                      key={attendee?.id}
                      href={`/c/${community.slug}/members/${attendee?.id}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={attendee?.id}>{content}</div>
                  )
                })}
              </div>
              {(rsvpCount || 0) > 20 && (
                <p className="text-sm text-muted-foreground mt-3">
                  And {(rsvpCount || 0) - 20} more...
                </p>
              )}
            </Card>
          )}

          {/* Share Event */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Share Event</h2>
            <ShareEventButton
              title={event.title}
              description={event.description || undefined}
              location={event.location || undefined}
              startsAt={event.starts_at}
              endsAt={event.ends_at}
              allDay={event.all_day}
              eventDate={format(startDate, 'EEEE, MMMM d')}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
