-- Migration: 015_marketplace_enhancements.sql
-- Description: Enhanced marketplace with escrow, messaging, reviews, disputes, and favorites
-- Version: 3.0

-- ============================================================================
-- ENHANCE EXISTING MARKETPLACE TABLES
-- ============================================================================

-- Add escrow columns to marketplace_transactions
ALTER TABLE marketplace_transactions
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'none'
    CHECK (escrow_status IN ('none', 'pending', 'held', 'released', 'refunded', 'disputed')),
  ADD COLUMN IF NOT EXISTS escrow_held_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

-- Add more details to marketplace_listings
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

-- ============================================================================
-- MARKETPLACE CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One conversation per buyer-listing pair
  UNIQUE(listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_listing ON marketplace_conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_buyer ON marketplace_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_seller ON marketplace_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_last_message ON marketplace_conversations(last_message_at DESC);

-- ============================================================================
-- MARKETPLACE MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'offer', 'system')),
  offer_amount DECIMAL(10,2), -- For offer messages
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_conversation ON marketplace_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_sender ON marketplace_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_unread ON marketplace_messages(conversation_id, is_read) WHERE is_read = false;

-- ============================================================================
-- MARKETPLACE REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_buyer_review BOOLEAN NOT NULL, -- true = buyer reviewing seller, false = seller reviewing buyer
  response TEXT, -- reviewee can respond
  response_at TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT true,
  flagged_at TIMESTAMPTZ,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per reviewer per transaction
  UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_transaction ON marketplace_reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewer ON marketplace_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewee ON marketplace_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_rating ON marketplace_reviews(reviewee_id, rating, is_visible);

-- ============================================================================
-- MARKETPLACE DISPUTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'item_not_received',
    'item_not_as_described',
    'item_damaged',
    'wrong_item',
    'payment_issue',
    'communication_issue',
    'other'
  )),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  buyer_statement TEXT,
  seller_statement TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open',
    'awaiting_buyer_response',
    'awaiting_seller_response',
    'under_review',
    'resolved_buyer_favor',
    'resolved_seller_favor',
    'resolved_split',
    'closed',
    'escalated'
  )),
  resolution_notes TEXT,
  resolution_amount DECIMAL(10,2), -- Amount refunded or adjusted
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  deadline TIMESTAMPTZ, -- Response deadline
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_transaction ON marketplace_disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_initiator ON marketplace_disputes(initiated_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_status ON marketplace_disputes(status, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_community ON marketplace_disputes(community_id, status);

-- Dispute timeline/history
CREATE TABLE IF NOT EXISTS marketplace_dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES marketplace_disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'opened',
    'buyer_responded',
    'seller_responded',
    'evidence_added',
    'status_changed',
    'escalated',
    'resolved',
    'closed'
  )),
  actor_id UUID REFERENCES auth.users(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_dispute_events_dispute ON marketplace_dispute_events(dispute_id, created_at);

-- ============================================================================
-- MARKETPLACE FAVORITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_member ON marketplace_favorites(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_listing ON marketplace_favorites(listing_id);

-- ============================================================================
-- SELLER PROFILES / STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_seller_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE UNIQUE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2), -- Percentage
  average_response_time INTEGER, -- Minutes
  dispute_rate DECIMAL(5,2), -- Percentage
  successful_transactions INTEGER DEFAULT 0,
  cancelled_transactions INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_stats_member ON marketplace_seller_stats(member_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_stats_rating ON marketplace_seller_stats(average_rating DESC NULLS LAST);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Conversations RLS
ALTER TABLE marketplace_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_conversations_select ON marketplace_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = marketplace_conversations.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = marketplace_conversations.buyer_id
        OR community_members.id = marketplace_conversations.seller_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY marketplace_conversations_insert ON marketplace_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = marketplace_conversations.buyer_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

CREATE POLICY marketplace_conversations_update ON marketplace_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = marketplace_conversations.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = marketplace_conversations.buyer_id
        OR community_members.id = marketplace_conversations.seller_id
      )
    )
  );

-- Messages RLS
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_messages_select ON marketplace_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_conversations mc
      JOIN community_members cm ON cm.community_id = mc.community_id
      WHERE mc.id = marketplace_messages.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (
        cm.id = mc.buyer_id
        OR cm.id = mc.seller_id
        OR cm.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY marketplace_messages_insert ON marketplace_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_conversations mc
      JOIN community_members cm ON cm.id = marketplace_messages.sender_id
      WHERE mc.id = marketplace_messages.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (cm.id = mc.buyer_id OR cm.id = mc.seller_id)
    )
  );

-- Reviews RLS
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_reviews_select ON marketplace_reviews FOR SELECT
  USING (
    is_visible = true
    OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = marketplace_reviews.community_id
      AND community_members.user_id = auth.uid()
      AND (
        community_members.id = marketplace_reviews.reviewer_id
        OR community_members.id = marketplace_reviews.reviewee_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY marketplace_reviews_insert ON marketplace_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = marketplace_reviews.reviewer_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM marketplace_transactions
      WHERE marketplace_transactions.id = marketplace_reviews.transaction_id
      AND marketplace_transactions.status = 'completed'
    )
  );

CREATE POLICY marketplace_reviews_update ON marketplace_reviews FOR UPDATE
  USING (
    -- Reviewer can update their review, reviewee can add response
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = marketplace_reviews.community_id
      AND community_members.user_id = auth.uid()
      AND (
        community_members.id = marketplace_reviews.reviewer_id
        OR community_members.id = marketplace_reviews.reviewee_id
      )
    )
  );

-- Disputes RLS
ALTER TABLE marketplace_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_disputes_select ON marketplace_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_transactions mt
      JOIN community_members cm ON cm.community_id = mt.community_id
      WHERE mt.id = marketplace_disputes.transaction_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (
        cm.id = mt.buyer_id
        OR cm.id = mt.seller_id
        OR cm.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY marketplace_disputes_insert ON marketplace_disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_transactions mt
      JOIN community_members cm ON cm.id = marketplace_disputes.initiated_by
      WHERE mt.id = marketplace_disputes.transaction_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (cm.id = mt.buyer_id OR cm.id = mt.seller_id)
    )
  );

CREATE POLICY marketplace_disputes_update ON marketplace_disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_transactions mt
      JOIN community_members cm ON cm.community_id = mt.community_id
      WHERE mt.id = marketplace_disputes.transaction_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (
        cm.id = mt.buyer_id
        OR cm.id = mt.seller_id
        OR cm.role IN ('admin', 'moderator')
      )
    )
  );

-- Dispute Events RLS
ALTER TABLE marketplace_dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_dispute_events_select ON marketplace_dispute_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_disputes md
      JOIN marketplace_transactions mt ON mt.id = md.transaction_id
      JOIN community_members cm ON cm.community_id = mt.community_id
      WHERE md.id = marketplace_dispute_events.dispute_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (
        cm.id = mt.buyer_id
        OR cm.id = mt.seller_id
        OR cm.role IN ('admin', 'moderator')
      )
    )
  );

-- Favorites RLS
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_favorites_select ON marketplace_favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = marketplace_favorites.member_id
      AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY marketplace_favorites_insert ON marketplace_favorites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = marketplace_favorites.member_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

CREATE POLICY marketplace_favorites_delete ON marketplace_favorites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = marketplace_favorites.member_id
      AND community_members.user_id = auth.uid()
    )
  );

-- Seller Stats RLS
ALTER TABLE marketplace_seller_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_seller_stats_select ON marketplace_seller_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = marketplace_seller_stats.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update conversation last message timestamp
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_conversations
  SET
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    buyer_unread_count = CASE
      WHEN EXISTS (SELECT 1 FROM community_members WHERE id = NEW.sender_id AND id != marketplace_conversations.buyer_id)
      THEN buyer_unread_count + 1
      ELSE buyer_unread_count
    END,
    seller_unread_count = CASE
      WHEN EXISTS (SELECT 1 FROM community_members WHERE id = NEW.sender_id AND id != marketplace_conversations.seller_id)
      THEN seller_unread_count + 1
      ELSE seller_unread_count
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON marketplace_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update listing favorites count
CREATE OR REPLACE FUNCTION update_listing_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE marketplace_listings
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE marketplace_listings
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_favorites_count
  AFTER INSERT OR DELETE ON marketplace_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_favorites_count();

-- Function to update seller stats after review
CREATE OR REPLACE FUNCTION update_seller_stats_on_review()
RETURNS TRIGGER AS $$
DECLARE
  seller_member_id UUID;
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Get seller's member_id from the transaction
  SELECT seller_id INTO seller_member_id
  FROM marketplace_transactions
  WHERE id = NEW.transaction_id;

  -- Calculate new average rating
  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO avg_rating, review_count
  FROM marketplace_reviews
  WHERE reviewee_id = seller_member_id
  AND is_buyer_review = true
  AND is_visible = true;

  -- Update or insert seller stats
  INSERT INTO marketplace_seller_stats (member_id, community_id, average_rating, total_reviews, updated_at)
  SELECT
    seller_member_id,
    NEW.community_id,
    avg_rating,
    review_count,
    NOW()
  ON CONFLICT (member_id) DO UPDATE
  SET
    average_rating = avg_rating,
    total_reviews = review_count,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seller_stats_on_review
  AFTER INSERT OR UPDATE ON marketplace_reviews
  FOR EACH ROW
  WHEN (NEW.is_buyer_review = true)
  EXECUTE FUNCTION update_seller_stats_on_review();

-- Function to schedule auto-release of escrow
CREATE OR REPLACE FUNCTION schedule_escrow_auto_release()
RETURNS TRIGGER AS $$
BEGIN
  -- Set auto-release 7 days after delivery confirmation
  IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    NEW.auto_release_at := NEW.delivered_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_escrow_auto_release
  BEFORE UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION schedule_escrow_auto_release();

-- ============================================================================
-- ESCROW MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to hold escrow
CREATE OR REPLACE FUNCTION hold_escrow(
  p_transaction_id UUID,
  p_payment_intent_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE marketplace_transactions
  SET
    escrow_status = 'held',
    escrow_held_at = NOW(),
    stripe_payment_intent_id = p_payment_intent_id,
    status = 'paid',
    updated_at = NOW()
  WHERE id = p_transaction_id
  AND escrow_status IN ('none', 'pending');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to release escrow
CREATE OR REPLACE FUNCTION release_escrow(
  p_transaction_id UUID,
  p_transfer_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE marketplace_transactions
  SET
    escrow_status = 'released',
    escrow_released_at = NOW(),
    stripe_transfer_id = COALESCE(p_transfer_id, stripe_transfer_id),
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_transaction_id
  AND escrow_status = 'held';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to refund escrow
CREATE OR REPLACE FUNCTION refund_escrow(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE marketplace_transactions
  SET
    escrow_status = 'refunded',
    status = 'refunded',
    refund_reason = COALESCE(p_reason, refund_reason),
    updated_at = NOW()
  WHERE id = p_transaction_id
  AND escrow_status IN ('held', 'disputed');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- ============================================================================

CREATE TRIGGER update_marketplace_conversations_updated_at
  BEFORE UPDATE ON marketplace_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_reviews_updated_at
  BEFORE UPDATE ON marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_disputes_updated_at
  BEFORE UPDATE ON marketplace_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_seller_stats_updated_at
  BEFORE UPDATE ON marketplace_seller_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
