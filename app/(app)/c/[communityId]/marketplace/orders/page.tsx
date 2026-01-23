'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Star,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { type TransactionWithDetails, type DisputeReason } from '@/lib/types/marketplace'

type TransactionStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'disputed' | 'cancelled'
type EscrowStatus = 'none' | 'pending' | 'held' | 'released' | 'refunded' | 'disputed'
type TabValue = 'purchases' | 'sales'

const statusConfig: Record<TransactionStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  disputed: { label: 'Disputed', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

const escrowStatusLabels: Record<EscrowStatus, string> = {
  none: 'No Escrow',
  pending: 'Payment Pending',
  held: 'Funds Held',
  released: 'Funds Released',
  refunded: 'Funds Refunded',
  disputed: 'Under Dispute',
}

const disputeReasons: { value: DisputeReason; label: string }[] = [
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'item_not_as_described', label: 'Item not as described' },
  { value: 'item_damaged', label: 'Item damaged' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'communication_issue', label: 'Communication issue' },
  { value: 'other', label: 'Other' },
]

export default function OrdersPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [purchases, setPurchases] = useState<TransactionWithDetails[]>([])
  const [sales, setSales] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('purchases')

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Dispute dialog
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('item_not_received')
  const [disputeDescription, setDisputeDescription] = useState('')

  // Confirm delivery dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  useEffect(() => {
    if (currentMemberId) {
      loadOrders()
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

  const loadOrders = async () => {
    if (!currentMemberId) return

    setLoading(true)
    try {
      // Load purchases (where I'm the buyer)
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          listing:marketplace_listings!listing_id(
            id,
            title,
            images,
            category
          ),
          buyer:community_members!buyer_id(
            id,
            display_name,
            avatar_url
          ),
          seller:community_members!seller_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .eq('buyer_id', currentMemberId)
        .order('created_at', { ascending: false })

      if (purchaseError) throw purchaseError

      // Load sales (where I'm the seller)
      const { data: salesData, error: salesError } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          listing:marketplace_listings!listing_id(
            id,
            title,
            images,
            category
          ),
          buyer:community_members!buyer_id(
            id,
            display_name,
            avatar_url
          ),
          seller:community_members!seller_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .eq('seller_id', currentMemberId)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      setPurchases(purchaseData as TransactionWithDetails[] || [])
      setSales(salesData as TransactionWithDetails[] || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!selectedTransaction) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('marketplace_transactions')
        .update({
          buyer_confirmed_at: new Date().toISOString(),
          status: 'completed',
          escrow_status: 'released',
          escrow_released_at: new Date().toISOString(),
        })
        .eq('id', selectedTransaction.id)

      if (error) throw error

      toast.success('Delivery confirmed! Funds have been released to the seller.')
      setConfirmDialogOpen(false)
      setSelectedTransaction(null)
      loadOrders()
    } catch (error) {
      console.error('Error confirming delivery:', error)
      toast.error('Failed to confirm delivery')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedTransaction || !currentMemberId) return

    setSubmitting(true)
    try {
      const isBuyer = selectedTransaction.buyer_id === currentMemberId
      const revieweeId = isBuyer ? selectedTransaction.seller_id : selectedTransaction.buyer_id

      const { error } = await supabase.from('marketplace_reviews').insert({
        transaction_id: selectedTransaction.id,
        community_id: communityId,
        reviewer_id: currentMemberId,
        reviewee_id: revieweeId,
        listing_id: selectedTransaction.listing?.id || null,
        rating,
        content: reviewContent.trim() || null,
        is_buyer_review: isBuyer,
      })

      if (error) throw error

      toast.success('Review submitted!')
      setReviewDialogOpen(false)
      setSelectedTransaction(null)
      setRating(5)
      setReviewContent('')
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDispute = async () => {
    if (!selectedTransaction || !currentMemberId) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('marketplace_disputes').insert({
        transaction_id: selectedTransaction.id,
        community_id: communityId,
        initiated_by: currentMemberId,
        reason: disputeReason,
        description: disputeDescription.trim(),
      })

      if (error) throw error

      // Update transaction status
      await supabase
        .from('marketplace_transactions')
        .update({ status: 'disputed', escrow_status: 'disputed' })
        .eq('id', selectedTransaction.id)

      toast.success('Dispute opened. Our team will review the case.')
      setDisputeDialogOpen(false)
      setSelectedTransaction(null)
      setDisputeReason('item_not_received')
      setDisputeDescription('')
      loadOrders()
    } catch (error) {
      console.error('Error opening dispute:', error)
      toast.error('Failed to open dispute')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderOrderCard = (order: TransactionWithDetails, isSeller: boolean) => {
    const StatusIcon = statusConfig[order.status as TransactionStatus]?.icon || Clock
    const otherParty = isSeller ? order.buyer : order.seller
    const canReview = order.status === 'completed'
    const canConfirmDelivery = !isSeller && order.escrow_status === 'held' && !order.buyer_confirmed_at
    const canDispute = order.escrow_status === 'held' && order.status !== 'disputed'

    return (
      <Card key={order.id} className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <Link
            href={`/c/${communityId}/marketplace/${order.listing?.id}`}
            className="flex-shrink-0"
          >
            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
              {order.listing?.images && order.listing.images.length > 0 ? (
                <img
                  src={order.listing.images[0]}
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
                  href={`/c/${communityId}/marketplace/${order.listing?.id}`}
                  className="font-medium hover:underline line-clamp-1"
                >
                  {order.listing?.title || 'Unknown Item'}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{isSeller ? 'Sold to' : 'Purchased from'}</span>
                  <span className="font-medium text-foreground">
                    {otherParty?.display_name || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">${order.total_price.toFixed(2)}</p>
                {isSeller && (
                  <p className="text-sm text-muted-foreground">
                    Net: ${order.net_amount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Badge
                variant="secondary"
                className={statusConfig[order.status as TransactionStatus]?.color}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[order.status as TransactionStatus]?.label}
              </Badge>

              {order.escrow_status !== 'none' && (
                <Badge variant="outline">
                  {escrowStatusLabels[order.escrow_status as EscrowStatus]}
                </Badge>
              )}

              {order.tracking_number && (
                <Badge variant="outline" className="gap-1">
                  <Truck className="h-3 w-3" />
                  {order.shipping_carrier}: {order.tracking_number}
                </Badge>
              )}

              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(order.created_at)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {canConfirmDelivery && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTransaction(order)
                    setConfirmDialogOpen(true)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirm Delivery
                </Button>
              )}

              {canReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTransaction(order)
                    setReviewDialogOpen(true)
                  }}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Leave Review
                </Button>
              )}

              {canDispute && !isSeller && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTransaction(order)
                    setDisputeDialogOpen(true)
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Open Dispute
                </Button>
              )}

              <Link href={`/c/${communityId}/marketplace/messages?conversation=${order.id}`}>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const renderEmptyState = (type: TabValue) => (
    <Card className="p-12 text-center">
      {type === 'purchases' ? (
        <>
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
          <p className="text-muted-foreground mb-4">
            Items you buy will appear here
          </p>
          <Link href={`/c/${communityId}/marketplace`}>
            <Button>Browse Marketplace</Button>
          </Link>
        </>
      ) : (
        <>
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sales yet</h3>
          <p className="text-muted-foreground mb-4">
            When you sell items, they&apos;ll appear here
          </p>
          <Link href={`/c/${communityId}/marketplace/new`}>
            <Button>Create Listing</Button>
          </Link>
        </>
      )}
    </Card>
  )

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/marketplace`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
        <h1 className="text-2xl font-bold">My Orders</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="mb-4">
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Purchases ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Sales ({sales.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            renderEmptyState('purchases')
          ) : (
            <div className="space-y-4">
              {purchases.map((order) => renderOrderCard(order, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : sales.length === 0 ? (
            renderEmptyState('sales')
          ) : (
            <div className="space-y-4">
              {sales.map((order) => renderOrderCard(order, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Delivery Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
            <DialogDescription>
              By confirming delivery, you acknowledge that you have received the item in satisfactory
              condition. The payment will be released to the seller.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-12 h-12 bg-background rounded overflow-hidden">
                {selectedTransaction.listing?.images?.[0] ? (
                  <img
                    src={selectedTransaction.listing.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{selectedTransaction.listing?.title}</p>
                <p className="text-sm text-primary">${selectedTransaction.total_price.toFixed(2)}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDelivery} disabled={submitting}>
              {submitting ? 'Confirming...' : 'Confirm & Release Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review">Review (optional)</Label>
              <Textarea
                id="review"
                placeholder="Share your experience..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a Dispute</DialogTitle>
            <DialogDescription>
              If you have an issue with this transaction, describe the problem and our team will
              review the case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={disputeReason} onValueChange={(v) => setDisputeReason(v as DisputeReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {disputeReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispute-description">Description *</Label>
              <Textarea
                id="dispute-description"
                placeholder="Please describe the issue in detail..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleOpenDispute}
              disabled={submitting || !disputeDescription.trim()}
            >
              {submitting ? 'Opening...' : 'Open Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
