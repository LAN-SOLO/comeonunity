import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  LayoutGrid,
  Users,
  Car,
  UserCheck,
  Calendar,
  ArrowRight,
  MapPin,
} from 'lucide-react'

interface OfficePageProps {
  params: Promise<{ communityId: string }>
}

async function getOfficeStats(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, communityId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: floorPlanCount },
    { count: deskCount },
    { count: todayDeskBookings },
    { count: roomCount },
    { count: todayRoomBookings },
    { count: parkingCount },
    { count: todayVisitors },
  ] = await Promise.all([
    supabase.from('floor_plans').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('is_active', true),
    supabase.from('desks').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('is_bookable', true),
    supabase.from('desk_bookings').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('booking_date', today).eq('status', 'confirmed'),
    supabase.from('meeting_rooms').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('is_active', true),
    supabase.from('room_bookings').select('*', { count: 'exact', head: true }).eq('community_id', communityId).gte('start_time', today).lt('start_time', today + 'T23:59:59').eq('status', 'confirmed'),
    supabase.from('parking_spots').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('is_active', true),
    supabase.from('visitors').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('visit_date', today).in('status', ['expected', 'checked_in']),
  ])

  return {
    floorPlanCount: floorPlanCount ?? 0,
    deskCount: deskCount ?? 0,
    todayDeskBookings: todayDeskBookings ?? 0,
    roomCount: roomCount ?? 0,
    todayRoomBookings: todayRoomBookings ?? 0,
    parkingCount: parkingCount ?? 0,
    todayVisitors: todayVisitors ?? 0,
  }
}

export default async function OfficePage({ params }: OfficePageProps) {
  const { communityId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check membership
  const { data: member } = await supabase
    .from('community_members')
    .select('id, role, community_id')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) {
    redirect('/')
  }

  // Check if community is office type
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, type')
    .eq('id', communityId)
    .single()

  if (!community || community.type !== 'office') {
    redirect(`/c/${communityId}`)
  }

  const stats = await getOfficeStats(supabase, communityId)
  const isAdmin = member.role === 'admin' || member.role === 'moderator'

  const quickActions = [
    {
      href: `/c/${communityId}/office/desks`,
      icon: LayoutGrid,
      label: 'Book a Desk',
      description: `${stats.deskCount} desks available`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      href: `/c/${communityId}/office/meeting-rooms`,
      icon: Users,
      label: 'Book a Room',
      description: `${stats.roomCount} meeting rooms`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      href: `/c/${communityId}/office/parking`,
      icon: Car,
      label: 'Reserve Parking',
      description: `${stats.parkingCount} parking spots`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      href: `/c/${communityId}/office/visitors`,
      icon: UserCheck,
      label: 'Register Visitor',
      description: `${stats.todayVisitors} visitors today`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Building2 className="h-4 w-4" />
          <span>Office Management</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{community.name}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace, book desks, meeting rooms, and more
        </p>
      </div>

      {/* Today's Overview */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today&apos;s Overview</h2>
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.todayDeskBookings}</div>
            <div className="text-sm text-muted-foreground">Desk Bookings</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.todayRoomBookings}</div>
            <div className="text-sm text-muted-foreground">Room Bookings</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.todayVisitors}</div>
            <div className="text-sm text-muted-foreground">Expected Visitors</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.floorPlanCount}</div>
            <div className="text-sm text-muted-foreground">Floor Plans</div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Team Location */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Where is Everyone?</h2>
        <Link
          href={`/c/${communityId}/office/team`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View Team Calendar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <Card className="p-6 mb-8">
        <Suspense fallback={<div className="text-muted-foreground">Loading team locations...</div>}>
          <TeamLocationPreview communityId={communityId} />
        </Suspense>
      </Card>

      {/* Floor Plans */}
      {isAdmin && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Floor Plans</h2>
            <Link
              href={`/c/${communityId}/office/floor-plans`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Manage Floor Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Card className="p-6">
            <Suspense fallback={<div className="text-muted-foreground">Loading floor plans...</div>}>
              <FloorPlanPreview communityId={communityId} />
            </Suspense>
          </Card>
        </>
      )}
    </div>
  )
}

async function TeamLocationPreview({ communityId }: { communityId: string }) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: locations } = await supabase
    .from('work_locations')
    .select(`
      id,
      location_type,
      member:community_members(
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('community_id', communityId)
    .eq('date', today)
    .eq('is_visible', true)
    .limit(6)

  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No team members have set their location for today</p>
      </div>
    )
  }

  const locationLabels: Record<string, string> = {
    office: 'In Office',
    home: 'Working from Home',
    travel: 'Traveling',
    off: 'Day Off',
    sick: 'Sick Leave',
    vacation: 'On Vacation',
  }

  const locationColors: Record<string, string> = {
    office: 'bg-green-500',
    home: 'bg-blue-500',
    travel: 'bg-orange-500',
    off: 'bg-gray-400',
    sick: 'bg-red-400',
    vacation: 'bg-purple-500',
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {locations.map((loc) => {
        // Handle Supabase relation that returns member as array
        const member = Array.isArray(loc.member) ? loc.member[0] : loc.member
        return (
        <div key={loc.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {member?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${locationColors[loc.location_type] || 'bg-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-sm">
              {member?.display_name || 'Unknown'}
            </div>
            <div className="text-xs text-muted-foreground">
              {locationLabels[loc.location_type] || loc.location_type}
            </div>
          </div>
        </div>
      )})}
    </div>
  )
}

async function FloorPlanPreview({ communityId }: { communityId: string }) {
  const supabase = await createClient()

  const { data: floorPlans } = await supabase
    .from('floor_plans')
    .select('id, name, floor_number')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('floor_number')
    .limit(5)

  if (!floorPlans || floorPlans.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No floor plans configured yet</p>
        <Link
          href={`/c/${communityId}/office/floor-plans/new`}
          className="text-sm text-primary hover:underline mt-2 inline-block"
        >
          Create your first floor plan
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {floorPlans.map((fp) => (
        <Link
          key={fp.id}
          href={`/c/${communityId}/office/floor-plans/${fp.id}`}
          className="p-4 rounded-lg border hover:border-primary/50 transition-colors text-center"
        >
          <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <div className="font-medium text-sm">{fp.name}</div>
          <div className="text-xs text-muted-foreground">Floor {fp.floor_number}</div>
        </Link>
      ))}
    </div>
  )
}
