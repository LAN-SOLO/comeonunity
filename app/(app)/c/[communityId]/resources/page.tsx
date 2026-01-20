'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResourceCard, typeLabels } from '@/components/resources/resource-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Calendar,
  Loader2,
  Plus,
  CalendarDays,
} from 'lucide-react'

interface Resource {
  id: string
  name: string
  description: string | null
  type: string
  location: string | null
  capacity: number | null
  image_url: string | null
  requires_approval: boolean
  available: boolean
}

export default function ResourcesPage() {
  const params = useParams()
  const communitySlug = params.communityId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug])

  useEffect(() => {
    if (communityId) {
      fetchResources()
      checkAdminStatus()
    }
  }, [communityId])

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

  const fetchResources = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('community_id', communityId)
        .order('name')

      if (error) throw error

      setResources(data || [])
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    setIsAdmin(member?.role === 'admin')
  }

  // Get unique resource types
  const resourceTypes = useMemo(() => {
    const types = new Set(resources.map((r) => r.type))
    return Array.from(types).sort()
  }, [resources])

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = resource.name.toLowerCase().includes(query)
        const descMatch = resource.description?.toLowerCase().includes(query)
        const locationMatch = resource.location?.toLowerCase().includes(query)
        if (!nameMatch && !descMatch && !locationMatch) {
          return false
        }
      }

      // Type filter
      if (selectedType !== 'all' && resource.type !== selectedType) {
        return false
      }

      return true
    })
  }, [resources, searchQuery, selectedType])

  // Stats
  const totalResources = resources.length
  const availableResources = resources.filter((r) => r.available).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shared Spaces</h1>
          <p className="text-muted-foreground">
            Book community facilities and shared resources
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/c/${communitySlug}/bookings`}>
              <CalendarDays className="h-4 w-4 mr-2" />
              My Bookings
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild>
              <Link href={`/c/${communitySlug}/admin/resources/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{totalResources}</p>
          <p className="text-sm text-muted-foreground">Total Resources</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green">{availableResources}</p>
          <p className="text-sm text-muted-foreground">Available</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabels[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {(searchQuery || selectedType !== 'all') && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredResources.length} of {totalResources} resources
        </p>
      )}

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedType !== 'all'
              ? 'Try adjusting your filters'
              : 'No shared spaces have been added yet'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              communityId={communitySlug}
            />
          ))}
        </div>
      )}
    </div>
  )
}
