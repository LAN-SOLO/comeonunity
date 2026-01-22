-- =====================================================
-- BILLING & SUBSCRIPTION TABLES
-- ComeOnUnity v2.0 - Pricing Model Implementation
-- =====================================================

-- Subscription tiers reference table
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_annual INTEGER NOT NULL DEFAULT 0,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  max_communities INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 5,
  max_items INTEGER NOT NULL DEFAULT 5,
  max_resources INTEGER NOT NULL DEFAULT 1,
  max_admins INTEGER NOT NULL DEFAULT 1,
  max_storage_mb INTEGER NOT NULL DEFAULT 100,
  features JSONB NOT NULL DEFAULT '{}',
  stripe_product_id TEXT,
  stripe_price_annual_id TEXT,
  stripe_price_monthly_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tier data (all paid with trials)
INSERT INTO subscription_tiers (id, name, display_name, description, price_annual, price_monthly,
  max_communities, max_members, max_items, max_resources, max_admins, max_storage_mb,
  features, sort_order) VALUES
('starter', 'starter', 'Starter', 'Perfect for small house communities', 900, 89, 1, 10, 10, 2, 1, 500,
  '{"events": true, "polls": false, "documents": false, "messaging": false, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 1),
('community', 'community', 'Community', 'Great for growing communities', 1500, 147, 1, 15, 20, 5, 1, 1024,
  '{"events": true, "polls": true, "documents": true, "messaging": false, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 2),
('growth', 'growth', 'Growth', 'For active, engaged communities', 3500, 342, 1, 30, 50, 10, 2, 3072,
  '{"events": true, "polls": true, "documents": true, "messaging": true, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 3),
('professional', 'professional', 'Professional', 'For large communities and property managers', 7900, 772, 3, 75, 150, 25, 3, 10240,
  '{"events": true, "polls": true, "documents": true, "messaging": true, "analytics": true, "customBranding": true, "prioritySupport": true, "apiAccess": false}', 4);

-- Trial tracking table (one trial per user ever)
CREATE TABLE user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  converted_to_paid BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cooldown_ends_at TIMESTAMPTZ,
  reminder_sent_day_7 BOOLEAN DEFAULT false,
  reminder_sent_day_12 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Community subscriptions
CREATE TABLE community_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  billing_period TEXT CHECK (billing_period IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused')),
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id)
);

-- Usage tracking per community
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('members', 'items', 'resources', 'storage_mb', 'admins')),
  current_value INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, metric)
);

-- Add-ons purchased
CREATE TABLE subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit INTEGER NOT NULL,
  stripe_subscription_item_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Billing history
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  description TEXT,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MARKETPLACE TABLES
-- =====================================================

-- Marketplace listings
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  category TEXT,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'for_parts')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'removed')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace transactions
CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
  buyer_id UUID NOT NULL REFERENCES community_members(id),
  seller_id UUID NOT NULL REFERENCES community_members(id),
  community_id UUID NOT NULL REFERENCES communities(id),
  item_price INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed', 'disputed')),
  buyer_message TEXT,
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee ledger for accounting
CREATE TABLE marketplace_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES marketplace_transactions(id),
  community_id UUID NOT NULL REFERENCES communities(id),
  gross_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  net_to_seller INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  is_refund BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_community_subscriptions_community ON community_subscriptions(community_id);
CREATE INDEX idx_community_subscriptions_stripe ON community_subscriptions(stripe_subscription_id);
CREATE INDEX idx_community_subscriptions_status ON community_subscriptions(status);
CREATE INDEX idx_community_subscriptions_trial ON community_subscriptions(is_trial, trial_ends_at);
CREATE INDEX idx_user_trials_user ON user_trials(user_id);
CREATE INDEX idx_user_trials_ends ON user_trials(trial_ends_at);
CREATE INDEX idx_usage_tracking_community ON usage_tracking(community_id);
CREATE INDEX idx_usage_tracking_metric ON usage_tracking(community_id, metric);
CREATE INDEX idx_billing_history_community ON billing_history(community_id);
CREATE INDEX idx_billing_history_created ON billing_history(created_at DESC);
CREATE INDEX idx_subscription_addons_community ON subscription_addons(community_id);
CREATE INDEX idx_marketplace_listings_community ON marketplace_listings(community_id);
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_marketplace_fee_ledger_community ON marketplace_fee_ledger(community_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_fee_ledger ENABLE ROW LEVEL SECURITY;

-- Subscription tiers are public (read-only)
CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers FOR SELECT
  USING (true);

-- Users can view their own trial status
CREATE POLICY "Users can view own trial"
  ON user_trials FOR SELECT
  USING (user_id = auth.uid());

-- Community admins can view their subscription
CREATE POLICY "Community admins can view subscription"
  ON community_subscriptions FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view usage tracking
CREATE POLICY "Community admins can view usage"
  ON usage_tracking FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view their add-ons
CREATE POLICY "Community admins can view addons"
  ON subscription_addons FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view billing history
CREATE POLICY "Community admins can view billing history"
  ON billing_history FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Members can view marketplace listings in their community
CREATE POLICY "Members can view marketplace listings"
  ON marketplace_listings FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can manage their own listings
CREATE POLICY "Users can manage own listings"
  ON marketplace_listings FOR ALL
  USING (
    seller_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    seller_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
  );

-- Users can view transactions they're involved in
CREATE POLICY "Users can view own transactions"
  ON marketplace_transactions FOR SELECT
  USING (
    buyer_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR
    seller_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- Platform admins can view all billing data
CREATE POLICY "Platform admins can view all subscriptions"
  ON community_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND platform_role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Platform admins can view all billing"
  ON billing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND platform_role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to check trial eligibility
CREATE OR REPLACE FUNCTION check_trial_eligibility(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  existing_trial RECORD;
BEGIN
  SELECT * INTO existing_trial
  FROM user_trials
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in cooldown period
CREATE OR REPLACE FUNCTION is_in_cooldown(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial RECORD;
BEGIN
  SELECT * INTO trial
  FROM user_trials
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF trial.cooldown_ends_at IS NOT NULL AND trial.cooldown_ends_at > NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_community_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  UPDATE usage_tracking
  SET current_value = current_value + p_amount,
      last_updated = NOW()
  WHERE community_id = p_community_id
    AND metric = p_metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement usage
CREATE OR REPLACE FUNCTION decrement_usage(
  p_community_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  UPDATE usage_tracking
  SET current_value = GREATEST(0, current_value - p_amount),
      last_updated = NOW()
  WHERE community_id = p_community_id
    AND metric = p_metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increase usage limit (for add-ons)
CREATE OR REPLACE FUNCTION increase_usage_limit(
  p_community_id UUID,
  p_metric TEXT,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE usage_tracking
  SET limit_value = limit_value + p_amount,
      last_updated = NOW()
  WHERE community_id = p_community_id
    AND metric = p_metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrease usage limit
CREATE OR REPLACE FUNCTION decrease_usage_limit(
  p_community_id UUID,
  p_metric TEXT,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE usage_tracking
  SET limit_value = GREATEST(0, limit_value - p_amount),
      last_updated = NOW()
  WHERE community_id = p_community_id
    AND metric = p_metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize usage tracking for a community
CREATE OR REPLACE FUNCTION initialize_usage_tracking(
  p_community_id UUID,
  p_tier_id TEXT
) RETURNS void AS $$
DECLARE
  tier RECORD;
BEGIN
  SELECT * INTO tier FROM subscription_tiers WHERE id = p_tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tier not found: %', p_tier_id;
  END IF;

  INSERT INTO usage_tracking (community_id, metric, current_value, limit_value)
  VALUES
    (p_community_id, 'members', 0, tier.max_members),
    (p_community_id, 'items', 0, tier.max_items),
    (p_community_id, 'resources', 0, tier.max_resources),
    (p_community_id, 'storage_mb', 0, tier.max_storage_mb),
    (p_community_id, 'admins', 0, tier.max_admins)
  ON CONFLICT (community_id, metric)
  DO UPDATE SET
    limit_value = EXCLUDED.limit_value,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check usage limit before insert
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_community_id UUID,
  p_metric TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  usage RECORD;
BEGIN
  SELECT current_value, limit_value INTO usage
  FROM usage_tracking
  WHERE community_id = p_community_id AND metric = p_metric;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN usage.current_value < usage.limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR USAGE TRACKING
-- =====================================================

-- Trigger function to enforce member limit
CREATE OR REPLACE FUNCTION check_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  can_add BOOLEAN;
BEGIN
  SELECT check_usage_limit(NEW.community_id, 'members') INTO can_add;

  IF NOT can_add THEN
    RAISE EXCEPTION 'Member limit reached for this community. Please upgrade your plan.';
  END IF;

  PERFORM increment_usage(NEW.community_id, 'members', 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for member removal
CREATE OR REPLACE FUNCTION decrement_member_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM decrement_usage(OLD.community_id, 'members', 1);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to enforce item limit
CREATE OR REPLACE FUNCTION check_item_limit()
RETURNS TRIGGER AS $$
DECLARE
  can_add BOOLEAN;
BEGIN
  SELECT check_usage_limit(NEW.community_id, 'items') INTO can_add;

  IF NOT can_add THEN
    RAISE EXCEPTION 'Item limit reached for this community. Please upgrade your plan.';
  END IF;

  PERFORM increment_usage(NEW.community_id, 'items', 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for item removal
CREATE OR REPLACE FUNCTION decrement_item_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM decrement_usage(OLD.community_id, 'items', 1);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to enforce resource limit
CREATE OR REPLACE FUNCTION check_resource_limit()
RETURNS TRIGGER AS $$
DECLARE
  can_add BOOLEAN;
BEGIN
  SELECT check_usage_limit(NEW.community_id, 'resources') INTO can_add;

  IF NOT can_add THEN
    RAISE EXCEPTION 'Resource limit reached for this community. Please upgrade your plan.';
  END IF;

  PERFORM increment_usage(NEW.community_id, 'resources', 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for resource removal
CREATE OR REPLACE FUNCTION decrement_resource_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM decrement_usage(OLD.community_id, 'resources', 1);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the triggers (commented out - uncomment when ready to enforce limits)
-- CREATE TRIGGER enforce_member_limit
--   BEFORE INSERT ON community_members
--   FOR EACH ROW
--   EXECUTE FUNCTION check_member_limit();

-- CREATE TRIGGER decrement_member_on_delete
--   AFTER DELETE ON community_members
--   FOR EACH ROW
--   EXECUTE FUNCTION decrement_member_count();

-- CREATE TRIGGER enforce_item_limit
--   BEFORE INSERT ON items
--   FOR EACH ROW
--   EXECUTE FUNCTION check_item_limit();

-- CREATE TRIGGER decrement_item_on_delete
--   AFTER DELETE ON items
--   FOR EACH ROW
--   EXECUTE FUNCTION decrement_item_count();

-- CREATE TRIGGER enforce_resource_limit
--   BEFORE INSERT ON resources
--   FOR EACH ROW
--   EXECUTE FUNCTION check_resource_limit();

-- CREATE TRIGGER decrement_resource_on_delete
--   AFTER DELETE ON resources
--   FOR EACH ROW
--   EXECUTE FUNCTION decrement_resource_count();

-- =====================================================
-- UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_subscriptions_timestamp
  BEFORE UPDATE ON community_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_marketplace_listings_timestamp
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_timestamp();
