'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowLeft,
  Plus,
  Package,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  ShoppingBag,
  Star,
  TrendingUp,
  Heart,
} from 'lucide-react'
import { toast } from 'sonner'
import { MARKETPLACE_CATEGORIES, type MarketplaceListing } from '@/lib/types/marketplace'

type ListingStatus = 'draft' | 'active' | 'sold' | 'reserved' | 'expired' | 'deleted'
type TabValue = 'active' | 'draft' | 'sold' | 'all'

const statusConfig: Record<ListingStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  sold: { label: 'Sold', color: 'bg-blue-100 text-blue-800', icon: ShoppingBag },
  reserved: { label: 'Reserved', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  deleted: { label: 'Deleted', color: 'bg-red-100 text-red-800', icon: Trash2 },
}

interface SellerStats {
  total_sales: number
  total_revenue: number
  average_rating: number | null
  total_reviews: number
  successful_transactions: number
}

export default function MyListingsPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('active')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  useEffect(() => {
    if (currentMemberId) {
      loadListings()
      loadStats()
    }
  }, [currentMemberId, activeTab])

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

  const loadListings = async () => {
    if (!currentMemberId) return

    setLoading(true)
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('community_id', communityId)
        .eq('seller_id', currentMemberId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      const { data, error } = await query

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error loading listings:', error)
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!currentMemberId) return

    const { data } = await supabase
      .from('marketplace_seller_stats')
      .select('*')
      .eq('member_id', currentMemberId)
      .single()

    if (data) {
      setStats(data)
    }
  }

  const updateListingStatus = async (listing: MarketplaceListing, newStatus: ListingStatus) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: newStatus })
      .eq('id', listing.id)

    if (error) {
      toast.error('Failed to update listing')
      return
    }

    toast.success(`Listing ${newStatus === 'active' ? 'published' : newStatus}`)
    loadListings()
  }

  const handleDelete = async () => {
    if (!selectedListing) return

    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: 'deleted' })
      .eq('id', selectedListing.id)

    if (error) {
      toast.error('Failed to delete listing')
      return
    }

    toast.success('Listing deleted')
    setDeleteDialogOpen(false)
    setSelectedListing(null)
    loadListings()
  }

  const getCounts = () => {
    const counts = { active: 0, draft: 0, sold: 0, all: 0 }
    // We'd need to fetch all to get accurate counts, for now just show current tab
    return counts
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/c/${communityId}/marketplace`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
          <h1 className="text-2xl font-bold">My Listings</h1>
        </div>
        <Link href={`/c/${communityId}/marketplace/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">${stats.total_revenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">{stats.total_sales}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-xl font-bold">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold">
                  {stats.total_sales > 0
                    ? `${Math.round((stats.successful_transactions / stats.total_sales) * 100)}%`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="sold">Sold</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'draft'
                  ? 'No drafts'
                  : activeTab === 'sold'
                  ? 'No sold items yet'
                  : 'No listings yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === 'draft'
                  ? 'Your draft listings will appear here'
                  : activeTab === 'sold'
                  ? 'Items you sell will appear here'
                  : 'Start selling by creating your first listing'}
              </p>
              {activeTab !== 'sold' && (
                <Link href={`/c/${communityId}/marketplace/new`}>
                  <Button>Create Listing</Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => {
                const StatusIcon = statusConfig[listing.status as ListingStatus]?.icon || Clock
                return (
                  <Card key={listing.id} className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link
                        href={`/c/${communityId}/marketplace/${listing.id}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link
                              href={`/c/${communityId}/marketplace/${listing.id}`}
                              className="font-medium hover:underline line-clamp-1"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-lg font-bold text-primary">
                              ${listing.price.toFixed(2)}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={statusConfig[listing.status as ListingStatus]?.color}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[listing.status as ListingStatus]?.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            {MARKETPLACE_CATEGORIES.find(c => c.value === listing.category)?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {listing.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {listing.favorites_count}
                          </span>
                          <span>Listed {formatDate(listing.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/c/${communityId}/marketplace/${listing.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/c/${communityId}/marketplace/${listing.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {listing.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateListingStatus(listing, 'active')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {listing.status === 'active' && (
                            <>
                              <DropdownMenuItem onClick={() => updateListingStatus(listing, 'sold')}>
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Mark as Sold
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateListingStatus(listing, 'draft')}>
                                <Archive className="h-4 w-4 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            </>
                          )}
                          {listing.status === 'sold' && (
                            <DropdownMenuItem onClick={() => updateListingStatus(listing, 'active')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Relist
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedListing(listing)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedListing?.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
