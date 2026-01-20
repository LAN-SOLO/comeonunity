'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CalendarCheck,
  Wrench,
  PartyPopper,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react'
import { format, isSameDay, isToday, isTomorrow, isPast } from 'date-fns'

export interface EventCardProps {
  event: {
    id: string
    title: string
    description?: string | null
    location?: string | null
    starts_at: string
    ends_at: string
    all_day?: boolean
    type: string
    color?: string | null
    cover_image_url?: string | null
    max_attendees?: number | null
    status: string
    organizer?: {
      id: string
      display_name: string | null
      avatar_url: string | null
    } | null
    rsvp_count?: number
    user_rsvp?: string | null
  }
  communityId: string
  variant?: 'card' | 'compact' | 'calendar'
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

export function EventCard({ event, communityId, variant = 'card' }: EventCardProps) {
  const Icon = typeIcons[event.type] || typeIcons.event
  const startDate = new Date(event.starts_at)
  const endDate = new Date(event.ends_at)
  const isPastEvent = isPast(endDate)
  const isCancelled = event.status === 'cancelled'

  const organizerName = event.organizer?.display_name || 'Unknown'
  const organizerInitials = organizerName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Format date display
  const getDateDisplay = () => {
    if (isToday(startDate)) return 'Today'
    if (isTomorrow(startDate)) return 'Tomorrow'
    return format(startDate, 'EEE, MMM d')
  }

  // Format time display
  const getTimeDisplay = () => {
    if (event.all_day) return 'All day'
    const startTime = format(startDate, 'h:mm a')
    const endTime = format(endDate, 'h:mm a')
    if (isSameDay(startDate, endDate)) {
      return `${startTime} - ${endTime}`
    }
    return `${startTime} - ${format(endDate, 'MMM d, h:mm a')}`
  }

  if (variant === 'compact') {
    return (
      <Link href={`/c/${communityId}/calendar/${event.id}`}>
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50',
            (isPastEvent || isCancelled) && 'opacity-60'
          )}
        >
          <div
            className="w-1 h-12 rounded-full shrink-0"
            style={{ backgroundColor: event.color || '#3B82F6' }}
          />
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium truncate', isCancelled && 'line-through')}>
              {event.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {getDateDisplay()} &middot; {getTimeDisplay()}
            </p>
          </div>
          {event.rsvp_count !== undefined && event.rsvp_count > 0 && (
            <Badge variant="secondary" className="shrink-0">
              <Users className="h-3 w-3 mr-1" />
              {event.rsvp_count}
            </Badge>
          )}
        </div>
      </Link>
    )
  }

  if (variant === 'calendar') {
    return (
      <Link href={`/c/${communityId}/calendar/${event.id}`}>
        <div
          className={cn(
            'text-xs p-1 rounded truncate cursor-pointer hover:opacity-80',
            (isPastEvent || isCancelled) && 'opacity-60'
          )}
          style={{ backgroundColor: event.color || '#3B82F6', color: 'white' }}
        >
          <span className={cn(isCancelled && 'line-through')}>{event.title}</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/c/${communityId}/calendar/${event.id}`}>
      <Card
        className={cn(
          'overflow-hidden transition-all hover:shadow-md',
          (isPastEvent || isCancelled) && 'opacity-60'
        )}
      >
        {event.cover_image_url && (
          <div className="h-32 overflow-hidden">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${event.color || '#3B82F6'}20`, color: event.color || '#3B82F6' }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {typeLabels[event.type] || 'Event'}
                </p>
                {isCancelled && (
                  <Badge variant="destructive" className="text-xs">
                    Cancelled
                  </Badge>
                )}
              </div>
            </div>
            {event.user_rsvp === 'going' && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Going
              </Badge>
            )}
          </div>

          <h3 className={cn('font-semibold text-lg mb-2', isCancelled && 'line-through')}>
            {event.title}
          </h3>

          {event.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{getDateDisplay()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{getTimeDisplay()}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={event.organizer?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{organizerInitials}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{organizerName}</span>
            </div>
            {event.rsvp_count !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {event.rsvp_count}
                  {event.max_attendees && ` / ${event.max_attendees}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
