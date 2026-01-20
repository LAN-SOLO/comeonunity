import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Package,
  Calendar,
  Newspaper,
  Settings,
  UserPlus,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

interface Props {
  params: Promise<{ communityId: string }>
}

export default async function AdminDashboardPage({ params }: Props) {
  const { communityId: slugOrId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)

  // Get community info by slug or ID
  let communityQuery = supabase
    .from('communities')
    .select('id, slug, name, plan, created_at')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
  } else {
    communityQuery = communityQuery.eq('slug', slugOrId)
  }

  const { data: community } = await communityQuery.single()

  if (!community) {
    redirect('/')
  }

  // Redirect to canonical slug URL if accessed by ID
  if (slugOrId !== community.slug && slugOrId === community.id) {
    redirect(`/c/${community.slug}/admin`)
  }

  const communitySlug = community.slug

  // Check admin status
  const { data: member } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
    redirect(`/c/${communitySlug}`)
  }

  // Get stats
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const [
    membersCount,
    newMembersCount,
    itemsCount,
    activeItemsCount,
    eventsCount,
    upcomingEventsCount,
    newsCount,
    pendingInvites,
  ] = await Promise.all([
    supabase
      .from('community_members')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'active'),
    supabase
      .from('community_members')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'active')
      .gte('joined_at', thirtyDaysAgo),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'available'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .neq('status', 'draft'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .neq('status', 'draft')
      .gte('starts_at', new Date().toISOString()),
    supabase
      .from('news')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('status', 'published'),
    supabase
      .from('invites')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
  ])

  // Get recent activity
  const { data: recentMembers } = await supabase
    .from('community_members')
    .select('id, display_name, avatar_url, joined_at')
    .eq('community_id', community.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      label: 'Total Members',
      value: membersCount.count || 0,
      subtext: `+${newMembersCount.count || 0} this month`,
      icon: Users,
      href: `/c/${communitySlug}/admin/members`,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Items',
      value: itemsCount.count || 0,
      subtext: `${activeItemsCount.count || 0} available`,
      icon: Package,
      href: `/c/${communitySlug}/items`,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Events',
      value: eventsCount.count || 0,
      subtext: `${upcomingEventsCount.count || 0} upcoming`,
      icon: Calendar,
      href: `/c/${communitySlug}/calendar`,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'News Articles',
      value: newsCount.count || 0,
      subtext: 'Published',
      icon: Newspaper,
      href: `/c/${communitySlug}/news`,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
  ]

  const quickActions = [
    {
      label: 'Manage Members',
      description: 'View, edit roles, and manage community members',
      icon: Users,
      href: `/c/${communitySlug}/admin/members`,
    },
    {
      label: 'Invite Members',
      description: 'Create and manage invite links',
      icon: UserPlus,
      href: `/c/${communitySlug}/admin/invites`,
    },
    {
      label: 'Create Event',
      description: 'Schedule a new community event',
      icon: Calendar,
      href: `/c/${communitySlug}/admin/events/new`,
    },
    {
      label: 'Post News',
      description: 'Create a news article or announcement',
      icon: Newspaper,
      href: `/c/${communitySlug}/admin/news/new`,
    },
    {
      label: 'Community Settings',
      description: 'Configure community preferences',
      icon: Settings,
      href: `/c/${communitySlug}/admin/settings`,
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage {community?.name || 'your community'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card className="p-4 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <action.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{action.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Members */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Members</h2>
          <Card className="p-4">
            {recentMembers && recentMembers.length > 0 ? (
              <div className="space-y-3">
                {recentMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/c/${communitySlug}/members/${m.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {m.display_name?.[0] || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(m.joined_at), 'MMM d')}
                      </p>
                    </div>
                  </Link>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href={`/c/${communitySlug}/admin/members`}>
                    View all members
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent members
              </p>
            )}
          </Card>

          {/* Pending Invites */}
          <Card className="p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Active Invites</h3>
              <span className="text-2xl font-bold">{pendingInvites.count || 0}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/c/${communitySlug}/admin/invites`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Invites
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
