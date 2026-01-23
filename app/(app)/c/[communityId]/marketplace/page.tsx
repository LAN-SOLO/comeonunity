'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Store,
  Search,
  Plus,
  Heart,
  MessageCircle,
  Grid3X3,
  List,
  Filter,
  SlidersHorizontal,
  Package,
  Star,
  Eye,
  Truck,
  MapPin,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MARKETPLACE_CATEGORIES,
  type ListingWithSeller,
  type MarketplaceCategory,
} from '@/lib/types/marketplace'

type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
type SortOption = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular'
type ViewMode = 'grid' | 'list'

const conditionLabels: Record<Condition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

const conditionColors: Record<Condition, string> = {
  new: 'bg-green-100 text-green-800',
  like_new: 'bg-blue-100 text-blue-800',
  good: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
}

export default function MarketplacePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [listings, setListings] = useState<ListingWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'all')
  const [condition, setCondition] = useState<string>(searchParams.get('condition') || 'all')
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest')
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 12

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  useEffect(() => {
    loadListings()
    loadFavorites()
  }, [communityId, searchQuery, category, condition, sortBy, minPrice, maxPrice, page])

  const loadCurrentMember = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (member) {
      setCurrentMemberId(member.id)
    }
  }

  const loadListings = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          seller:community_members!seller_id(
            id,
            display_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('community_id', communityId)
        .eq('status', 'active')

      // Apply filters
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      if (condition && condition !== 'all') {
        query = query.eq('condition', condition)
      }
      if (minPrice) {
        query = query.gte('price', parseFloat(minPrice))
      }
      if (maxPrice) {
        query = query.lte('price', parseFloat(maxPrice))
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'price_low':
          query = query.order('price', { ascending: true })
          break
        case 'price_high':
          query = query.order('price', { ascending: false })
          break
        case 'popular':
          query = query.order('views_count', { ascending: false })
          break
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setListings(data as ListingWithSeller[] || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading listings:', error)
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    if (!currentMemberId) return

    const { data } = await supabase
      .from('marketplace_favorites')
      .select('listing_id')
      .eq('member_id', currentMemberId)
      .eq('community_id', communityId)

    if (data) {
      setFavorites(new Set(data.map(f => f.listing_id)))
    }
  }

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentMemberId) {
      toast.error('Please sign in to save favorites')
      return
    }

    const isFavorited = favorites.has(listingId)

    if (isFavorited) {
      const { error } = await supabase
        .from('marketplace_favorites')
        .delete()
        .eq('member_id', currentMemberId)
        .eq('listing_id', listingId)

      if (!error) {
        setFavorites(prev => {
          const next = new Set(prev)
          next.delete(listingId)
          return next
        })
        toast.success('Removed from favorites')
      }
    } else {
      const { error } = await supabase
        .from('marketplace_favorites')
        .insert({
          member_id: currentMemberId,
          listing_id: listingId,
          community_id: communityId,
        })

      if (!error) {
        setFavorites(prev => new Set([...prev, listingId]))
        toast.success('Added to favorites')
      }
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategory('all')
    setCondition('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('newest')
    setPage(1)
  }

  const hasActiveFilters = searchQuery || category !== 'all' || condition !== 'all' || minPrice || maxPrice

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Store className="h-4 w-4" />
            <span>Marketplace</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Community Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell within your community
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/c/${communityId}/marketplace/favorites`}>
            <Button variant="outline" className="gap-2">
              <Heart className="h-4 w-4" />
              Favorites
            </Button>
          </Link>
          <Link href={`/c/${communityId}/marketplace/my-listings`}>
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              My Listings
            </Button>
          </Link>
          <Link href={`/c/${communityId}/marketplace/messages`}>
            <Button variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Messages
            </Button>
          </Link>
          <Link href={`/c/${communityId}/marketplace/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Sell Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>

          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>

          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Condition</label>
              <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Min Price</label>
              <Input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
                className="w-[120px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Max Price</label>
              <Input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
                className="w-[120px]"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2 text-muted-foreground">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'listing' : 'listings'} found
        </p>
      </div>

      {/* Listings Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No listings found</h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters to find more items'
              : 'Be the first to list an item in the marketplace!'}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Link href={`/c/${communityId}/marketplace/new`}>
              <Button>List Your First Item</Button>
            </Link>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/c/${communityId}/marketplace/${listing.id}`}>
              <Card className="overflow-hidden hover:border-primary/50 transition-all group cursor-pointer h-full">
                {/* Image */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Featured Badge */}
                  {listing.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}

                  {/* Favorite Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => toggleFavorite(listing.id, e)}
                  >
                    <Heart
                      className={`h-4 w-4 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>

                  {/* Shipping/Pickup Icons */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {listing.shipping_available && (
                      <Badge variant="secondary" className="h-6 px-2 bg-background/80">
                        <Truck className="h-3 w-3" />
                      </Badge>
                    )}
                    {listing.pickup_available && (
                      <Badge variant="secondary" className="h-6 px-2 bg-background/80">
                        <MapPin className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium line-clamp-2">{listing.title}</h3>
                    <span className="text-lg font-bold text-primary whitespace-nowrap">
                      ${listing.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className={conditionColors[listing.condition as Condition]}
                    >
                      {conditionLabels[listing.condition as Condition]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {MARKETPLACE_CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                    </span>
                  </div>

                  {/* Seller */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {listing.seller?.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="truncate">{listing.seller?.display_name || 'Unknown'}</span>
                    {listing.seller_rating && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-3 w-3 fill-current" />
                        {listing.seller_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {listing.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {listing.favorites_count}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/c/${communityId}/marketplace/${listing.id}`}>
              <Card className="overflow-hidden hover:border-primary/50 transition-all group cursor-pointer">
                <div className="flex">
                  {/* Image */}
                  <div className="w-48 h-48 bg-muted relative flex-shrink-0">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {listing.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {listing.description || 'No description'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">
                          ${listing.price.toFixed(2)}
                        </span>
                        {listing.original_price && listing.original_price > listing.price && (
                          <div className="text-sm text-muted-foreground line-through">
                            ${listing.original_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="secondary"
                        className={conditionColors[listing.condition as Condition]}
                      >
                        {conditionLabels[listing.condition as Condition]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {MARKETPLACE_CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                      </span>
                      {listing.shipping_available && (
                        <Badge variant="outline" className="gap-1">
                          <Truck className="h-3 w-3" />
                          Shipping
                        </Badge>
                      )}
                      {listing.pickup_available && (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          Pickup
                        </Badge>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {listing.seller?.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span>{listing.seller?.display_name || 'Unknown'}</span>
                        {listing.seller_rating && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Star className="h-3 w-3 fill-current" />
                            {listing.seller_rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {listing.views_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {listing.favorites_count} favorites
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => toggleFavorite(listing.id, e)}
                        >
                          <Heart
                            className={`h-4 w-4 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
