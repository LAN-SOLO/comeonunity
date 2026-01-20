'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ItemCard } from '@/components/items/item-card'
import { CategoryFilter } from '@/components/items/category-filter'
import {
  Search,
  Package,
  Grid3X3,
  List,
  Loader2,
  Plus,
  CheckCircle,
} from 'lucide-react'

interface Item {
  id: string
  name: string
  description: string | null
  category: string
  status: 'available' | 'borrowed' | 'unavailable'
  images: string[] | null
  condition: string | null
  owner_id: string
  owner: {
    id: string
    display_name: string | null
    avatar_url: string | null
    unit_number: string | null
  }
}

export default function ItemsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const communitySlug = params.communityId as string
  const ownerFilter = searchParams.get('owner')

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug])

  const initializePage = async () => {
    setIsLoading(true)
    try {
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

      const { data: community, error: communityError } = await communityQuery.single()

      if (communityError || !community) {
        return
      }

      setCommunityId(community.id)

      // Fetch items
      await fetchItems(community.id)
      // Fetch current member
      await fetchCurrentMember(community.id)
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItems = async (actualCommunityId: string) => {
    try {
      let query = supabase
        .from('items')
        .select(`
          id,
          name,
          description,
          category,
          status,
          images,
          condition,
          owner_id,
          owner:owner_id (
            id,
            display_name,
            avatar_url,
            unit_number
          )
        `)
        .eq('community_id', actualCommunityId)
        .order('created_at', { ascending: false })

      if (ownerFilter) {
        query = query.eq('owner_id', ownerFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Process data to fix owner type (Supabase returns it properly but TS thinks it's an array)
      const processedItems = (data || []).map((item: any) => ({
        ...item,
        owner: item.owner as Item['owner'],
      })) as Item[]

      setItems(processedItems)
    } catch {
      // Silently fail - tables may not exist yet
    }
  }

  const fetchCurrentMember = async (actualCommunityId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', actualCommunityId)
      .eq('user_id', user.id)
      .single()

    if (member) {
      setCurrentMemberId(member.id)
    }
  }

  // Filter items based on search, categories, and availability
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = item.name.toLowerCase().includes(query)
        const descMatch = item.description?.toLowerCase().includes(query)
        const categoryMatch = item.category.toLowerCase().includes(query)
        if (!nameMatch && !descMatch && !categoryMatch) {
          return false
        }
      }

      // Category filter
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.category)) {
          return false
        }
      }

      // Availability filter
      if (showAvailableOnly && item.status !== 'available') {
        return false
      }

      return true
    })
  }, [items, searchQuery, selectedCategories, showAvailableOnly])

  // Stats
  const totalItems = items.length
  const availableItems = items.filter((i) => i.status === 'available').length
  const borrowedItems = items.filter((i) => i.status === 'borrowed').length

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
          <h1 className="text-2xl font-bold tracking-tight">Lending Library</h1>
          <p className="text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? 's' : ''} shared in this community
          </p>
        </div>
        <Button asChild>
          <Link href={`/c/${communitySlug}/items/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{totalItems}</p>
          <p className="text-sm text-muted-foreground">Total Items</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green">{availableItems}</p>
          <p className="text-sm text-muted-foreground">Available</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{borrowedItems}</p>
          <p className="text-sm text-muted-foreground">Borrowed</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <CategoryFilter
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
          />
          <Button
            variant={showAvailableOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
            className="whitespace-nowrap"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Available
          </Button>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'grid' | 'list')}
          >
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="px-3">
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Owner filter indicator */}
      {ownerFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing items from a specific member
          </span>
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href={`/c/${communitySlug}/items`}>Clear filter</Link>
          </Button>
        </div>
      )}

      {/* Results count */}
      {(searchQuery || selectedCategories.length > 0 || showAvailableOnly) && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredItems.length} of {totalItems} items
        </p>
      )}

      {/* Items Grid/List */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No items found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedCategories.length > 0 || showAvailableOnly
              ? 'Try adjusting your filters'
              : 'Be the first to share an item with your community!'}
          </p>
          {!searchQuery && selectedCategories.length === 0 && !showAvailableOnly && (
            <Button asChild>
              <Link href={`/c/${communitySlug}/items/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Link>
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              communityId={communitySlug}
              variant="card"
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              communityId={communitySlug}
              variant="list"
            />
          ))}
        </Card>
      )}
    </div>
  )
}
