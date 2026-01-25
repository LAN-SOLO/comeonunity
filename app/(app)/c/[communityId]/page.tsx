import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/design-system/stat-card'
import { SectionHeader } from '@/components/design-system/section-header'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import {
  Users,
  Package,
  Calendar,
  Newspaper,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react'

interface Props {
  params: Promise<{ communityId: string }>
}

interface BookingWithResource {
  id: string
  title: string | null
  starts_at: string
  ends_at: string
  resource: { name: string } | { name: string }[] | null
}

interface NewsWithAuthor {
  id: string
  title: string
  type: string
  published_at: string
  author: { display_name: string | null; avatar_url: string | null } | { display_name: string | null; avatar_url: string | null }[] | null
}

interface RecentMember {
  id: string
  display_name: string | null
  avatar_url: string | null
  joined_at: string
}

export default async function CommunityDashboard({ params }: Props) {
  const { communityId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)

  // First, find community by slug or ID
  let communityQuery = supabase
    .from('communities')
    .select('id, name, slug, description, type, logo_url, plan')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communityId},id.eq.${communityId}`)
  } else {
    communityQuery = communityQuery.eq('slug', communityId)
  }

  const { data: community } = await communityQuery.single()

  if (!community) {
    notFound()
  }

  // Redirect to canonical slug URL if accessed by ID
  if (communityId !== community.slug && communityId === community.id) {
    redirect(`/c/${community.slug}`)
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('community_members')
    .select('id, role, display_name, joined_at')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    notFound()
  }

  const isAdmin = membership.role === 'admin'
  const communitySlug = community.slug

  // Server-side date computation for membership checks
  // eslint-disable-next-line react-hooks/purity -- Server Component: Date is stable per request
  const currentTimestamp = Date.now()
  const today = new Date(currentTimestamp)
  const weekAgo = new Date(currentTimestamp - 7 * 24 * 60 * 60 * 1000)
  const isNewMember = membership.joined_at
    ? new Date(membership.joined_at as string) > weekAgo
    : false

  const [
    { count: totalMembers },
    { count: totalItems },
    { count: availableItems },
    { data: upcomingBookings },
    { data: recentNews },
    { data: recentMembers },
  ] = await Promise.all([
    supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'active'),
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id),
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'available'),
    supabase
      .from('bookings')
      .select(`
        id,
        title,
        starts_at,
        ends_at,
        resource:resources (name)
      `)
      .eq('status', 'confirmed')
      .gte('starts_at', today.toISOString())
      .order('starts_at')
      .limit(5),
    supabase
      .from('news')
      .select(`
        id,
        title,
        type,
        published_at,
        author:community_members (display_name, avatar_url)
      `)
      .eq('community_id', community.id)
      .order('published_at', { ascending: false })
      .limit(3),
    supabase
      .from('community_members')
      .select('id, display_name, avatar_url, joined_at')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .limit(5),
  ])

  // Get upcoming bookings count
  const { count: upcomingBookingsCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .gte('starts_at', today.toISOString())
    .eq('status', 'confirmed')

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-xl">
            {community.logo_url ? (
              <AvatarImage src={community.logo_url} />
            ) : null}
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl">
              {community.name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{community.name}</h1>
            <p className="text-muted-foreground">
              {community.description || 'Welcome to your community dashboard'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href={`/c/${communitySlug}/admin`}>
              Admin Settings
            </Link>
          </Button>
        )}
      </div>

      {/* Welcome Banner for new members */}
      {isNewMember && (
        <WelcomeBanner
          communityId={communityId}
          memberName={membership.display_name}
          isNewMember={true}
        />
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Members"
          value={totalMembers || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Items Available"
          value={`${availableItems || 0}/${totalItems || 0}`}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Upcoming Bookings"
          value={upcomingBookingsCount || 0}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="News Posts"
          value={recentNews?.length || 0}
          icon={<Newspaper className="w-5 h-5" />}
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href={`/c/${communitySlug}/items/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/c/${communitySlug}/calendar`}>
              <Calendar className="mr-2 h-4 w-4" />
              Book Resource
            </Link>
          </Button>
          {(isAdmin || membership.role === 'moderator') && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/c/${communitySlug}/news/new`}>
                <Newspaper className="mr-2 h-4 w-4" />
                Post News
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Bookings */}
        <div>
          <SectionHeader
            title="Upcoming Bookings"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/c/${communitySlug}/calendar`}>
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <Card>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="divide-y divide-border">
                {upcomingBookings.map((booking: BookingWithResource) => {
                  const resource = Array.isArray(booking.resource) ? booking.resource[0] : booking.resource
                  return (
                  <div key={booking.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {booking.title || resource?.name || 'Booking'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.starts_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming bookings</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recent News */}
        <div>
          <SectionHeader
            title="Recent News"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/c/${communitySlug}/news`}>
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <Card>
            {recentNews && recentNews.length > 0 ? (
              <div className="divide-y divide-border">
                {recentNews.map((post: NewsWithAuthor) => {
                  const author = Array.isArray(post.author) ? post.author[0] : post.author
                  return (
                  <Link
                    key={post.id}
                    href={`/c/${communitySlug}/news/${post.id}`}
                    className="p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors block"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={author?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {author?.display_name?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{post.title}</p>
                        {post.type === 'important' && (
                          <Badge variant="destructive" className="text-xs">Important</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {author?.display_name} · {new Date(post.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No news posts yet</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <SectionHeader title="Recent Activity" />
          <ActivityFeed communitySlug={communitySlug} limit={8} />
        </div>

        {/* New Members */}
        <div>
          <SectionHeader
            title="New Members"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/c/${communitySlug}/members`}>
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <Card className="p-4">
            {recentMembers && recentMembers.length > 0 ? (
              <div className="space-y-3">
                {recentMembers.map((member: RecentMember) => (
                  <Link
                    key={member.id}
                    href={`/c/${communitySlug}/members/${member.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {member.display_name?.[0] || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.display_name || 'Member'}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    {new Date(member.joined_at) > weekAgo && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <Sparkles className="h-3 w-3 mr-1" />
                        New
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
