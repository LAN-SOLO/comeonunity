'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Calendar,
  Newspaper,
  Users,
  CalendarCheck,
  HandCoins,
  Loader2,
  Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'item_added' | 'booking_created' | 'event_created' | 'member_joined' | 'news_published' | 'borrow_request'
  title: string
  description?: string
  href: string
  timestamp: string
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface ActivityFeedProps {
  communitySlug: string
  limit?: number
}

const activityIcons: Record<ActivityItem['type'], React.ComponentType<{ className?: string }>> = {
  item_added: Package,
  booking_created: CalendarCheck,
  event_created: Calendar,
  member_joined: Users,
  news_published: Newspaper,
  borrow_request: HandCoins,
}

const activityColors: Record<ActivityItem['type'], string> = {
  item_added: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  booking_created: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  event_created: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  member_joined: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  news_published: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  borrow_request: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
}

const activityLabels: Record<ActivityItem['type'], string> = {
  item_added: 'added an item',
  booking_created: 'made a booking',
  event_created: 'created an event',
  member_joined: 'joined the community',
  news_published: 'published news',
  borrow_request: 'requested to borrow',
}

export function ActivityFeed({ communitySlug, limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [communityId, setCommunityId] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const supabase = createClient()

  useEffect(() => {
    isMountedRef.current = true

    const fetchActivity = async () => {
      if (isMountedRef.current) setIsLoading(true)
      try {
        // First resolve slug to community ID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

        let communityQuery = supabase
          .from('communities')
          .select('id')
          .eq('status', 'active')

        if (isUUID) {
          communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
        } else {
          communityQuery = communityQuery.eq('slug', communitySlug)
        }

        const { data: community } = await communityQuery.single()

        if (!community || !isMountedRef.current) {
          setIsLoading(false)
          return
        }

        const cId = community.id
        setCommunityId(cId)

        const allActivities: ActivityItem[] = []

        // Fetch all data in parallel
        const [itemsResult, eventsResult, newsResult, membersResult] = await Promise.all([
          supabase
            .from('items')
            .select(`
              id,
              name,
              created_at,
              owner:owner_id (
                id,
                display_name,
                avatar_url
              )
            `)
            .eq('community_id', cId)
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('events')
            .select(`
              id,
              title,
              created_at,
              organizer:organizer_id (
                id,
                display_name,
                avatar_url
              )
            `)
            .eq('community_id', cId)
            .neq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('news')
            .select(`
              id,
              title,
              published_at,
              author:author_id (
                id,
                display_name,
                avatar_url
              )
            `)
            .eq('community_id', cId)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(limit),
          supabase
            .from('community_members')
            .select('id, display_name, avatar_url, joined_at')
            .eq('community_id', cId)
            .eq('status', 'active')
            .order('joined_at', { ascending: false })
            .limit(limit),
        ])

        if (!isMountedRef.current) return

        const items = itemsResult.data
        const events = eventsResult.data
        const news = newsResult.data
        const members = membersResult.data

        items?.forEach((item) => {
          const owner = item.owner as any
          allActivities.push({
            id: `item-${item.id}`,
            type: 'item_added',
            title: item.name,
            href: `/c/${communitySlug}/items/${item.id}`,
            timestamp: item.created_at,
            actor: owner,
          })
        })

        events?.forEach((event) => {
          const organizer = event.organizer as any
          allActivities.push({
            id: `event-${event.id}`,
            type: 'event_created',
            title: event.title,
            href: `/c/${communitySlug}/calendar/${event.id}`,
            timestamp: event.created_at,
            actor: organizer,
          })
        })

        news?.forEach((article) => {
          const author = article.author as any
          allActivities.push({
            id: `news-${article.id}`,
            type: 'news_published',
            title: article.title,
            href: `/c/${communitySlug}/news/${article.id}`,
            timestamp: article.published_at,
            actor: author,
          })
        })

        members?.forEach((member) => {
          allActivities.push({
            id: `member-${member.id}`,
            type: 'member_joined',
            title: member.display_name || 'New member',
            href: `/c/${communitySlug}/members/${member.id}`,
            timestamp: member.joined_at,
            actor: {
              id: member.id,
              display_name: member.display_name,
              avatar_url: member.avatar_url,
            },
          })
        })

        // Sort by timestamp and limit
        allActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        if (isMountedRef.current) {
          setActivities(allActivities.slice(0, limit))
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      } finally {
        if (isMountedRef.current) setIsLoading(false)
      }
    }

    fetchActivity()

    return () => {
      isMountedRef.current = false
    }
  }, [communitySlug, limit, supabase])

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No recent activity</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type]
          const colorClass = activityColors[activity.type]

          return (
            <Link
              key={activity.id}
              href={activity.href}
              className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              {activity.type === 'member_joined' ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.actor?.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(activity.actor?.display_name ?? null)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {activity.type !== 'member_joined' && activity.actor && (
                    <span className="font-medium">{activity.actor.display_name || 'Someone'}</span>
                  )}
                  {activity.type !== 'member_joined' && ' '}
                  <span className="text-muted-foreground">{activityLabels[activity.type]}</span>
                </p>
                <p className="font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
