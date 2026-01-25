'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Heart,
  Package,
  Star,
  Eye,
  Truck,
  MapPin,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { MARKETPLACE_CATEGORIES, type ListingWithSeller } from '@/lib/types/marketplace'

type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'

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

interface FavoriteWithListing {
  id: string
  listing_id: string
  created_at: string
  listing: ListingWithSeller
}

export default function FavoritesPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [favorites, setFavorites] = useState<FavoriteWithListing[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  useEffect(() => {
    if (currentMemberId) {
      loadFavorites()
    }
  }, [currentMemberId])

  const loadCurrentMember = async () => {
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

    if (member) {
      setCurrentMemberId(member.id)
    } else {
      toast.error('You must be a community member')
      router.push(`/c/${communityId}/marketplace`)
    }
  }

  const loadFavorites = async () => {
    if (!currentMemberId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('marketplace_favorites')
        .select(`
          id,
          listing_id,
          created_at,
          listing:marketplace_listings!listing_id(
            *,
            seller:community_members!seller_id(
              id,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('member_id', currentMemberId)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform nested arrays to single objects and filter out deleted listings
      interface RawFavorite {
        id: string
        listing_id: string
        created_at: string
        listing: ListingWithSeller | ListingWithSeller[] | null
      }

      const transformedData = (data || []).map((f: RawFavorite) => {
        const listing = Array.isArray(f.listing) ? f.listing[0] : f.listing
        if (listing?.seller) {
          listing.seller = Array.isArray(listing.seller) ? listing.seller[0] : listing.seller
        }
        return { ...f, listing }
      })

      const validFavorites = transformedData.filter(
        (f): f is FavoriteWithListing => f.listing !== null && f.listing !== undefined && f.listing.status !== 'deleted'
      )

      setFavorites(validFavorites)
    } catch (error) {
      console.error('Error loading favorites:', error)
      toast.error('Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (favoriteId: string, listingId: string) => {
    const { error } = await supabase
      .from('marketplace_favorites')
      .delete()
      .eq('id', favoriteId)

    if (error) {
      toast.error('Failed to remove from favorites')
      return
    }

    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
    toast.success('Removed from favorites')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/marketplace`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Saved Items
        </h1>
        <p className="text-muted-foreground mt-1">
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {/* Favorites Grid */}
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
      ) : favorites.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved items</h3>
          <p className="text-muted-foreground mb-4">
            Save items you&apos;re interested in to view them later
          </p>
          <Link href={`/c/${communityId}/marketplace`}>
            <Button>Browse Listings</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((favorite) => {
            const listing = favorite.listing
            const isSold = listing.status === 'sold'
            const isExpired = listing.status === 'expired'
            const isUnavailable = isSold || isExpired

            return (
              <Card
                key={favorite.id}
                className={`overflow-hidden group ${isUnavailable ? 'opacity-75' : ''}`}
              >
                <Link href={`/c/${communityId}/marketplace/${listing.id}`}>
                  {/* Image */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                          isUnavailable ? 'grayscale' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}

                    {/* Status Badge */}
                    {isSold && (
                      <Badge className="absolute top-2 left-2 bg-blue-600">
                        Sold
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge className="absolute top-2 left-2 bg-orange-600">
                        Expired
                      </Badge>
                    )}
                    {listing.is_featured && !isUnavailable && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}

                    {/* Remove Button */}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeFavorite(favorite.id, listing.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>

                    {/* Delivery Icons */}
                    {!isUnavailable && (
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
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  <Link href={`/c/${communityId}/marketplace/${listing.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium line-clamp-2 hover:underline">
                        {listing.title}
                      </h3>
                      <span
                        className={`text-lg font-bold whitespace-nowrap ${
                          isUnavailable ? 'text-muted-foreground' : 'text-primary'
                        }`}
                      >
                        ${listing.price.toFixed(2)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className={conditionColors[listing.condition as Condition]}
                    >
                      {conditionLabels[listing.condition as Condition]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {MARKETPLACE_CATEGORIES.find((c) => c.value === listing.category)?.label ||
                        listing.category}
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

                  {/* Saved Date */}
                  <p className="text-xs text-muted-foreground mt-2">
                    Saved {formatDate(favorite.created_at)}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
