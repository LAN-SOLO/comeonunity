'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Users,
  Calendar,
  Building2,
  Home,
  Plane,
  Coffee,
  Thermometer,
  Palmtree,
  Loader2,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LocationType } from '@/lib/types/office'

interface WorkLocationWithMember {
  id: string
  member_id: string
  date: string
  location_type: LocationType
  notes: string | null
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  desk?: {
    id: string
    name: string
  } | null
}

const locationConfig: Record<LocationType, { icon: typeof Building2; label: string; color: string; bgColor: string }> = {
  office: { icon: Building2, label: 'In Office', color: 'text-green-600', bgColor: 'bg-green-500' },
  home: { icon: Home, label: 'Working from Home', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  travel: { icon: Plane, label: 'Traveling', color: 'text-orange-600', bgColor: 'bg-orange-500' },
  off: { icon: Coffee, label: 'Day Off', color: 'text-gray-600', bgColor: 'bg-gray-400' },
  sick: { icon: Thermometer, label: 'Sick Leave', color: 'text-red-600', bgColor: 'bg-red-400' },
  vacation: { icon: Palmtree, label: 'On Vacation', color: 'text-purple-600', bgColor: 'bg-purple-500' },
}

export default function TeamCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<WorkLocationWithMember[]>([])
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.setDate(diff))
  })
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [myLocations, setMyLocations] = useState<Record<string, LocationType>>({})

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return date
  })

  useEffect(() => {
    loadTeamLocations()
  }, [weekStart])

  const loadTeamLocations = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push('/')
        return
      }

      setCurrentMemberId(member.id)

      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = weekDays[4].toISOString().split('T')[0]

      const { data: locationData, error } = await supabase
        .from('work_locations')
        .select(`
          id,
          member_id,
          date,
          location_type,
          notes,
          desk_id,
          member:community_members(id, display_name, avatar_url),
          desk:desks(id, name)
        `)
        .eq('community_id', communityId)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_visible', true)
        .order('date')

      if (error) throw error

      // Transform nested arrays to single objects
      const transformedData: WorkLocationWithMember[] = (locationData || []).map((loc) => ({
        id: loc.id,
        member_id: loc.member_id,
        date: loc.date,
        location_type: loc.location_type as LocationType,
        notes: loc.notes,
        member: Array.isArray(loc.member) ? loc.member[0] : loc.member,
        desk: Array.isArray(loc.desk) ? loc.desk[0] : loc.desk,
      }))

      setLocations(transformedData)

      // Extract my locations
      const myLocs: Record<string, LocationType> = {}
      locationData?.forEach((loc) => {
        if (loc.member_id === member.id) {
          myLocs[loc.date] = loc.location_type as LocationType
        }
      })
      setMyLocations(myLocs)
    } catch (error) {
      console.error('Error loading team locations:', error)
      toast.error('Failed to load team calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleSetMyLocation = async (date: string, locationType: LocationType) => {
    if (!currentMemberId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('work_locations')
        .upsert({
          member_id: currentMemberId,
          community_id: communityId,
          date,
          location_type: locationType,
          is_visible: true,
        }, {
          onConflict: 'member_id,date',
        })

      if (error) throw error

      setMyLocations((prev) => ({ ...prev, [date]: locationType }))
      toast.success('Location updated')
      loadTeamLocations()
    } catch (error) {
      console.error('Error setting location:', error)
      toast.error('Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  const navigateWeek = (weeks: number) => {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + weeks * 7)
    setWeekStart(newStart)
  }

  const isThisWeek = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const thisWeekStart = new Date(today.setDate(diff))
    return weekStart.toDateString() === thisWeekStart.toDateString()
  }

  // Group locations by member
  const memberLocations = locations.reduce<Record<string, WorkLocationWithMember[]>>((acc, loc) => {
    const memberId = loc.member_id
    if (!acc[memberId]) acc[memberId] = []
    acc[memberId].push(loc)
    return acc
  }, {})

  // Get unique members
  const members = Object.values(memberLocations).map((locs) => locs[0].member)

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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            See where everyone is working this week
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {weekDays[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {isThisWeek() && (
                <Badge variant="secondary" className="mt-1">This Week</Badge>
              )}
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Set My Location */}
      <Card className="p-4 mb-6">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Set Your Location
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map((day) => {
            const dateStr = day.toISOString().split('T')[0]
            const isPast = day < new Date(new Date().toISOString().split('T')[0])
            const isToday = dateStr === new Date().toISOString().split('T')[0]

            return (
              <div key={dateStr} className="text-center">
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-sm mb-2 ${isToday ? 'font-bold' : ''}`}>
                  {day.getDate()}
                </div>
                <Select
                  value={myLocations[dateStr] || ''}
                  onValueChange={(value) => handleSetMyLocation(dateStr, value as LocationType)}
                  disabled={isPast || saving}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Set..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(locationConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-3 w-3 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Team Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Team Locations Set</h3>
          <p className="text-muted-foreground">
            Be the first to set your location for this week!
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Team Member</th>
                  {weekDays.map((day) => {
                    const dateStr = day.toISOString().split('T')[0]
                    const isToday = dateStr === new Date().toISOString().split('T')[0]
                    return (
                      <th
                        key={dateStr}
                        className={`text-center p-3 font-medium ${isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className="text-xs text-muted-foreground">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={isToday ? 'text-primary font-bold' : ''}>
                          {day.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const memberLocs = memberLocations[member.id] || []
                  const locByDate: Record<string, WorkLocationWithMember> = {}
                  memberLocs.forEach((loc) => {
                    locByDate[loc.date] = loc
                  })

                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {member.display_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium truncate max-w-[120px]">
                            {member.display_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dateStr = day.toISOString().split('T')[0]
                        const loc = locByDate[dateStr]
                        const isToday = dateStr === new Date().toISOString().split('T')[0]

                        if (!loc) {
                          return (
                            <td
                              key={dateStr}
                              className={`text-center p-3 ${isToday ? 'bg-primary/5' : ''}`}
                            >
                              <span className="text-muted-foreground text-sm">-</span>
                            </td>
                          )
                        }

                        const config = locationConfig[loc.location_type as LocationType]
                        const Icon = config?.icon || Building2

                        return (
                          <td
                            key={dateStr}
                            className={`text-center p-3 ${isToday ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className={`p-1.5 rounded-full ${config?.bgColor || 'bg-gray-400'}/20`}>
                                <Icon className={`h-4 w-4 ${config?.color || 'text-gray-600'}`} />
                              </div>
                              {loc.desk && loc.location_type === 'office' && (
                                <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                                  {loc.desk.name}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {Object.entries(locationConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
