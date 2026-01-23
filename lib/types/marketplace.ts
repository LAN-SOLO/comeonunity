/**
 * Enhanced Marketplace Types - ComeOnUnity v3
 *
 * Types for escrow, messaging, reviews, disputes, and favorites
 */

// ============================================================================
// ESCROW STATUS
// ============================================================================

export type EscrowStatus =
  | 'none'
  | 'pending'
  | 'held'
  | 'released'
  | 'refunded'
  | 'disputed'

// ============================================================================
// ENHANCED TRANSACTIONS
// ============================================================================

export interface MarketplaceTransaction {
  id: string
  listing_id: string
  community_id: string
  buyer_id: string
  seller_id: string
  quantity: number
  unit_price: number
  total_price: number
  fee_amount: number
  net_amount: number
  status: 'pending' | 'paid' | 'completed' | 'refunded' | 'disputed' | 'cancelled'
  escrow_status: EscrowStatus
  escrow_held_at: string | null
  escrow_released_at: string | null
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  buyer_confirmed_at: string | null
  auto_release_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  tracking_number: string | null
  shipping_carrier: string | null
  refund_reason: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithDetails extends MarketplaceTransaction {
  listing: {
    id: string
    title: string
    images: string[]
    category: string
  }
  buyer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  seller: {
    id: string
    display_name: string | null
    avatar_url: string | null
    rating?: number
  }
}

// ============================================================================
// ENHANCED LISTINGS
// ============================================================================

export interface MarketplaceListing {
  id: string
  community_id: string
  seller_id: string
  title: string
  description: string | null
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  price: number
  original_price: number | null
  quantity: number
  images: string[]
  status: 'draft' | 'active' | 'sold' | 'reserved' | 'expired' | 'deleted'
  views_count: number
  favorites_count: number
  is_featured: boolean
  featured_until: string | null
  shipping_available: boolean
  shipping_cost: number
  pickup_available: boolean
  pickup_location: string | null
  seller_rating: number | null
  sold_count: number
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface ListingWithSeller extends MarketplaceListing {
  seller: {
    id: string
    display_name: string | null
    avatar_url: string | null
    rating?: number
    total_reviews?: number
  }
  is_favorited?: boolean
}

export interface CreateListingInput {
  title: string
  description?: string
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  price: number
  original_price?: number
  quantity?: number
  images?: string[]
  shipping_available?: boolean
  shipping_cost?: number
  pickup_available?: boolean
  pickup_location?: string
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  status?: 'draft' | 'active' | 'sold' | 'reserved' | 'expired'
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

export type ConversationStatus = 'active' | 'archived' | 'blocked'

export interface MarketplaceConversation {
  id: string
  listing_id: string
  community_id: string
  buyer_id: string
  seller_id: string
  status: ConversationStatus
  last_message_at: string
  buyer_unread_count: number
  seller_unread_count: number
  created_at: string
  updated_at: string
}

export interface ConversationWithDetails extends MarketplaceConversation {
  listing: {
    id: string
    title: string
    price: number
    images: string[]
    status: string
  }
  buyer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  seller: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message?: {
    id: string
    content: string
    sender_id: string
    created_at: string
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

export type MessageType = 'text' | 'image' | 'offer' | 'system'

export interface MarketplaceMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: MessageType
  offer_amount: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface MessageWithSender extends MarketplaceMessage {
  sender: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateMessageInput {
  content: string
  message_type?: MessageType
  offer_amount?: number
}

// ============================================================================
// REVIEWS
// ============================================================================

export interface MarketplaceReview {
  id: string
  transaction_id: string
  community_id: string
  reviewer_id: string
  reviewee_id: string
  listing_id: string | null
  rating: number
  title: string | null
  content: string | null
  is_buyer_review: boolean
  response: string | null
  response_at: string | null
  is_visible: boolean
  flagged_at: string | null
  flagged_reason: string | null
  created_at: string
  updated_at: string
}

export interface ReviewWithDetails extends MarketplaceReview {
  reviewer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  reviewee: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  listing?: {
    id: string
    title: string
  } | null
}

export interface CreateReviewInput {
  transaction_id: string
  rating: number
  title?: string
  content?: string
}

export interface ReviewResponseInput {
  response: string
}

// ============================================================================
// DISPUTES
// ============================================================================

export type DisputeReason =
  | 'item_not_received'
  | 'item_not_as_described'
  | 'item_damaged'
  | 'wrong_item'
  | 'payment_issue'
  | 'communication_issue'
  | 'other'

export type DisputeStatus =
  | 'open'
  | 'awaiting_buyer_response'
  | 'awaiting_seller_response'
  | 'under_review'
  | 'resolved_buyer_favor'
  | 'resolved_seller_favor'
  | 'resolved_split'
  | 'closed'
  | 'escalated'

export interface MarketplaceDispute {
  id: string
  transaction_id: string
  community_id: string
  initiated_by: string
  reason: DisputeReason
  description: string
  evidence_urls: string[]
  buyer_statement: string | null
  seller_statement: string | null
  status: DisputeStatus
  resolution_notes: string | null
  resolution_amount: number | null
  resolved_by: string | null
  resolved_at: string | null
  escalated_at: string | null
  escalation_reason: string | null
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface DisputeWithDetails extends MarketplaceDispute {
  transaction: TransactionWithDetails
  initiator: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  resolver?: {
    id: string
    display_name: string | null
  } | null
}

export interface CreateDisputeInput {
  transaction_id: string
  reason: DisputeReason
  description: string
  evidence_urls?: string[]
}

export interface UpdateDisputeInput {
  buyer_statement?: string
  seller_statement?: string
  evidence_urls?: string[]
}

export interface ResolveDisputeInput {
  status: 'resolved_buyer_favor' | 'resolved_seller_favor' | 'resolved_split' | 'closed'
  resolution_notes: string
  resolution_amount?: number
}

// ============================================================================
// DISPUTE EVENTS
// ============================================================================

export type DisputeEventType =
  | 'opened'
  | 'buyer_responded'
  | 'seller_responded'
  | 'evidence_added'
  | 'status_changed'
  | 'escalated'
  | 'resolved'
  | 'closed'

export interface MarketplaceDisputeEvent {
  id: string
  dispute_id: string
  event_type: DisputeEventType
  actor_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================================
// FAVORITES
// ============================================================================

export interface MarketplaceFavorite {
  id: string
  member_id: string
  listing_id: string
  community_id: string
  created_at: string
}

export interface FavoriteWithListing extends MarketplaceFavorite {
  listing: ListingWithSeller
}

// ============================================================================
// SELLER STATS
// ============================================================================

export interface MarketplaceSellerStats {
  id: string
  member_id: string
  community_id: string
  total_sales: number
  total_revenue: number
  average_rating: number | null
  total_reviews: number
  response_rate: number | null
  average_response_time: number | null
  dispute_rate: number | null
  successful_transactions: number
  cancelled_transactions: number
  last_active_at: string
  created_at: string
  updated_at: string
}

// ============================================================================
// ESCROW FLOW
// ============================================================================

export interface EscrowPaymentInput {
  listing_id: string
  quantity?: number
}

export interface EscrowPaymentResult {
  transaction_id: string
  payment_intent_id: string
  client_secret: string
  amount: number
  fee: number
}

export interface ConfirmDeliveryInput {
  transaction_id: string
}

export interface ShipmentUpdateInput {
  transaction_id: string
  tracking_number?: string
  shipping_carrier?: string
}

// ============================================================================
// MARKETPLACE CATEGORIES
// ============================================================================

export const MARKETPLACE_CATEGORIES = [
  { value: 'electronics', label: 'Electronics', labelDe: 'Elektronik' },
  { value: 'furniture', label: 'Furniture', labelDe: 'Möbel' },
  { value: 'clothing', label: 'Clothing', labelDe: 'Kleidung' },
  { value: 'books', label: 'Books', labelDe: 'Bücher' },
  { value: 'sports', label: 'Sports & Outdoors', labelDe: 'Sport & Outdoor' },
  { value: 'home', label: 'Home & Garden', labelDe: 'Haus & Garten' },
  { value: 'toys', label: 'Toys & Games', labelDe: 'Spielzeug' },
  { value: 'art', label: 'Art & Collectibles', labelDe: 'Kunst & Sammlerstücke' },
  { value: 'vehicles', label: 'Vehicles', labelDe: 'Fahrzeuge' },
  { value: 'services', label: 'Services', labelDe: 'Dienstleistungen' },
  { value: 'other', label: 'Other', labelDe: 'Sonstiges' },
] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]['value']

// ============================================================================
// FEE CALCULATION
// ============================================================================

export function calculateMarketplaceFee(price: number): {
  fee: number
  feePercent: number
  netAmount: number
} {
  let fee: number
  let feePercent: number

  if (price === 0) {
    fee = 0
    feePercent = 0
  } else if (price <= 10) {
    fee = 0.25
    feePercent = (0.25 / price) * 100
  } else if (price <= 50) {
    fee = price * 0.025
    feePercent = 2.5
  } else if (price <= 200) {
    fee = price * 0.02
    feePercent = 2.0
  } else {
    fee = Math.min(price * 0.015, 10)
    feePercent = fee === 10 ? (10 / price) * 100 : 1.5
  }

  return {
    fee: Math.round(fee * 100) / 100,
    feePercent: Math.round(feePercent * 100) / 100,
    netAmount: Math.round((price - fee) * 100) / 100,
  }
}
