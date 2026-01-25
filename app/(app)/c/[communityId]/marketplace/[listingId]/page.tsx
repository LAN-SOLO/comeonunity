'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Store,
  ArrowLeft,
  Heart,
  Share2,
  MessageCircle,
  Truck,
  MapPin,
  Star,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Package,
  User,
  Flag,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MARKETPLACE_CATEGORIES,
  calculateMarketplaceFee,
  type ListingWithSeller,
} from '@/lib/types/marketplace'

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

interface SellerStats {
  total_sales: number
  average_rating: number | null
  total_reviews: number
  response_rate: number | null
  successful_transactions: number
}

interface Review {
  id: string
  rating: number
  title: string | null
  content: string | null
  created_at: string
  reviewer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const listingId = params.listingId as string
  const supabase = createClient()

  const [listing, setListing] = useState<ListingWithSeller | null>(null)
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null)
  const [sellerReviews, setSellerReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [buyDialogOpen, setBuyDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadCurrentMember()
    loadListing()
  }, [communityId, listingId])

  useEffect(() => {
    if (listing) {
      loadSellerStats()
      loadSellerReviews()
      incrementViews()
    }
  }, [listing?.seller_id])

  useEffect(() => {
    if (currentMemberId && listingId) {
      checkFavorite()
    }
  }, [currentMemberId, listingId])

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

  const loadListing = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          seller:community_members!seller_id(
            id,
            display_name,
            avatar_url,
            created_at
          )
        `)
        .eq('id', listingId)
        .eq('community_id', communityId)
        .single()

      if (error) throw error
      setListing(data as ListingWithSeller)
    } catch (error) {
      console.error('Error loading listing:', error)
      toast.error('Listing not found')
      router.push(`/c/${communityId}/marketplace`)
    } finally {
      setLoading(false)
    }
  }

  const loadSellerStats = async () => {
    if (!listing?.seller_id) return

    const { data } = await supabase
      .from('marketplace_seller_stats')
      .select('*')
      .eq('member_id', listing.seller_id)
      .single()

    if (data) {
      setSellerStats(data)
    }
  }

  const loadSellerReviews = async () => {
    if (!listing?.seller_id) return

    const { data } = await supabase
      .from('marketplace_reviews')
      .select(`
        id,
        rating,
        title,
        content,
        created_at,
        reviewer:community_members!reviewer_id(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('reviewee_id', listing.seller_id)
      .eq('is_buyer_review', true)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      const reviews = data.map(review => ({
        ...review,
        reviewer: Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer
      })) as Review[]
      setSellerReviews(reviews)
    }
  }

  const incrementViews = async () => {
    // Only increment once per session
    const viewedKey = `viewed_${listingId}`
    if (sessionStorage.getItem(viewedKey)) return
    sessionStorage.setItem(viewedKey, 'true')

    await supabase
      .from('marketplace_listings')
      .update({ views_count: (listing?.views_count || 0) + 1 })
      .eq('id', listingId)
  }

  const checkFavorite = async () => {
    const { data } = await supabase
      .from('marketplace_favorites')
      .select('id')
      .eq('member_id', currentMemberId!)
      .eq('listing_id', listingId)
      .single()

    setIsFavorited(!!data)
  }

  const toggleFavorite = async () => {
    if (!currentMemberId) {
      toast.error('Please sign in to save favorites')
      return
    }

    if (isFavorited) {
      const { error } = await supabase
        .from('marketplace_favorites')
        .delete()
        .eq('member_id', currentMemberId)
        .eq('listing_id', listingId)

      if (!error) {
        setIsFavorited(false)
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
        setIsFavorited(true)
        toast.success('Added to favorites')
      }
    }
  }

  const handleSendMessage = async () => {
    if (!currentMemberId || !listing) {
      toast.error('Please sign in to send messages')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)
    try {
      // Check for existing conversation
      let { data: conversation } = await supabase
        .from('marketplace_conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', currentMemberId)
        .single()

      // Create conversation if doesn't exist
      if (!conversation) {
        const { data: newConvo, error: convoError } = await supabase
          .from('marketplace_conversations')
          .insert({
            listing_id: listingId,
            community_id: communityId,
            buyer_id: currentMemberId,
            seller_id: listing.seller_id,
          })
          .select()
          .single()

        if (convoError) throw convoError
        conversation = newConvo
      }

      if (!conversation) throw new Error('Failed to get conversation')

      // Send message
      const { error: msgError } = await supabase
        .from('marketplace_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentMemberId,
          content: message.trim(),
          message_type: 'text',
        })

      if (msgError) throw msgError

      toast.success('Message sent!')
      setMessageDialogOpen(false)
      setMessage('')
      router.push(`/c/${communityId}/marketplace/messages`)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: listing?.description || '',
          url,
        })
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return formatDate(dateStr)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-12 bg-muted rounded w-1/3" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return null
  }

  const isOwnListing = currentMemberId === listing.seller_id
  const feeInfo = calculateMarketplaceFee(listing.price)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href={`/c/${communityId}/marketplace`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {listing.images && listing.images.length > 0 ? (
              <>
                <img
                  src={listing.images[currentImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-contain bg-black/5"
                />
                {listing.images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                      onClick={() => setCurrentImageIndex(i => (i === 0 ? listing.images!.length - 1 : i - 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                      onClick={() => setCurrentImageIndex(i => (i === listing.images!.length - 1 ? 0 : i + 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {listing.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? 'bg-primary' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}

            {listing.is_featured && (
              <Badge className="absolute top-4 left-4 bg-yellow-500 text-yellow-950">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>

          {/* Thumbnail Strip */}
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {listing.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listing Details */}
        <div className="space-y-6">
          {/* Title & Price */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={conditionColors[listing.condition as Condition]}>
                {conditionLabels[listing.condition as Condition]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {MARKETPLACE_CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
              </span>
            </div>

            <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">${listing.price.toFixed(2)}</span>
              {listing.original_price && listing.original_price > listing.price && (
                <span className="text-lg text-muted-foreground line-through">
                  ${listing.original_price.toFixed(2)}
                </span>
              )}
            </div>

            {listing.quantity > 1 && (
              <p className="text-sm text-muted-foreground mt-1">
                {listing.quantity} available
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {listing.views_count} views
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {listing.favorites_count} favorites
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeAgo(listing.created_at)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isOwnListing ? (
              <Link href={`/c/${communityId}/marketplace/${listing.id}/edit`} className="flex-1">
                <Button className="w-full" size="lg">
                  Edit Listing
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  onClick={() => setMessageDialogOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact Seller
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setBuyDialogOpen(true)}
                >
                  Buy Now
                </Button>
              </>
            )}
            <Button variant="outline" size="lg" onClick={toggleFavorite}>
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="outline" size="lg" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Delivery Options */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Delivery Options</h3>
            <div className="space-y-2">
              {listing.shipping_available && (
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Shipping Available</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.shipping_cost > 0
                        ? `+$${listing.shipping_cost.toFixed(2)} shipping`
                        : 'Free shipping'}
                    </p>
                  </div>
                </div>
              )}
              {listing.pickup_available && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Local Pickup</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.pickup_location || 'Location to be discussed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {listing.description || 'No description provided.'}
            </p>
          </Card>

          {/* Seller Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Seller Information</h3>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                {listing.seller?.avatar_url ? (
                  <img
                    src={listing.seller.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  listing.seller?.display_name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{listing.seller?.display_name || 'Unknown Seller'}</p>
                {sellerStats && (
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {sellerStats.average_rating && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-4 w-4 fill-current" />
                        {sellerStats.average_rating.toFixed(1)} ({sellerStats.total_reviews} reviews)
                      </span>
                    )}
                    <span>{sellerStats.total_sales} sales</span>
                    {sellerStats.response_rate && (
                      <span>{sellerStats.response_rate}% response rate</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Listed {formatDate(listing.created_at)}
                </div>
              </div>
              {!isOwnListing && (
                <Link href={`/c/${communityId}/marketplace?seller=${listing.seller_id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              )}
            </div>

            {/* Recent Reviews */}
            {sellerReviews.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Recent Reviews</h4>
                <div className="space-y-3">
                  {sellerReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          {review.reviewer?.display_name}
                        </span>
                      </div>
                      {review.content && (
                        <p className="text-muted-foreground mt-1 line-clamp-2">{review.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Trust & Safety */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Community Marketplace</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All transactions are protected by our escrow system. Payment is only released to the
                  seller after you confirm receipt and satisfaction.
                </p>
              </div>
            </div>
          </Card>

          {/* Report */}
          {!isOwnListing && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                <Flag className="h-4 w-4" />
                Report Listing
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
            <DialogDescription>
              Send a message to {listing.seller?.display_name || 'the seller'} about this listing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
              <div className="h-12 w-12 bg-background rounded overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium line-clamp-1">{listing.title}</p>
                <p className="text-sm text-primary">${listing.price.toFixed(2)}</p>
              </div>
            </div>

            <Textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Be specific about your questions and availability for pickup/delivery.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Item</DialogTitle>
            <DialogDescription>
              Review your order before proceeding to payment.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-16 w-16 bg-background rounded overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  {conditionLabels[listing.condition as Condition]}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Item Price</span>
                <span>${listing.price.toFixed(2)}</span>
              </div>
              {listing.shipping_available && listing.shipping_cost > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>+${listing.shipping_cost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Service Fee ({feeInfo.feePercent.toFixed(1)}%)</span>
                <span>+${feeInfo.fee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>
                  ${(listing.price + (listing.shipping_cost || 0) + feeInfo.fee).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Buyer Protection</p>
                <p className="text-green-700 dark:text-green-300">
                  Your payment will be held in escrow until you confirm receipt and satisfaction.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.info('Payment integration coming soon!')
              setBuyDialogOpen(false)
            }}>
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
