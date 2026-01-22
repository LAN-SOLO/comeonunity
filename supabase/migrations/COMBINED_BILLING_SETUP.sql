-- =====================================================
-- COMBINED BILLING SETUP - Run this in Supabase SQL Editor
-- Includes: 011_create_billing_tables + 012_addon_prices + 013_update_stripe_ids
-- =====================================================

-- =====================================================
-- PART 1: BILLING & SUBSCRIPTION TABLES
-- =====================================================

-- Subscription tiers reference table
CREATE TABLE IF NOT EXISTS subscription_tiers (
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

-- Insert tier data
INSERT INTO subscription_tiers (id, name, display_name, description, price_annual, price_monthly,
  max_communities, max_members, max_items, max_resources, max_admins, max_storage_mb,
  features, sort_order,
  stripe_product_id, stripe_price_annual_id, stripe_price_monthly_id) VALUES
('starter', 'starter', 'Starter', 'Perfect for small house communities', 900, 89, 1, 10, 10, 2, 1, 500,
  '{"events": true, "polls": false, "documents": false, "messaging": false, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 1,
  'prod_Tq1VJvsgRM3iXm', 'price_1SsLSFFCgCQzJKRszG0Vwm5O', 'price_1SsLSFFCgCQzJKRspIKgLhBc'),
('community', 'community', 'Community', 'Great for growing communities', 1500, 147, 1, 15, 20, 5, 1, 1024,
  '{"events": true, "polls": true, "documents": true, "messaging": false, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 2,
  'prod_Tq1VHf5DzNG9j9', 'price_1SsLSGFCgCQzJKRsHDfazRlC', 'price_1SsLSGFCgCQzJKRsGeOkAooL'),
('growth', 'growth', 'Growth', 'For active, engaged communities', 3500, 342, 1, 30, 50, 10, 2, 3072,
  '{"events": true, "polls": true, "documents": true, "messaging": true, "analytics": true, "customBranding": false, "prioritySupport": false, "apiAccess": false}', 3,
  'prod_Tq1V94Ke5WORjw', 'price_1SsLSHFCgCQzJKRs6U0uaQji', 'price_1SsLSHFCgCQzJKRsjcG6Su5P'),
('professional', 'professional', 'Professional', 'For large communities and property managers', 7900, 772, 3, 75, 150, 25, 3, 10240,
  '{"events": true, "polls": true, "documents": true, "messaging": true, "analytics": true, "customBranding": true, "prioritySupport": true, "apiAccess": false}', 4,
  'prod_Tq1VfqFNzJVqMD', 'price_1SsLSHFCgCQzJKRsSgS6a44h', 'price_1SsLSIFCgCQzJKRsDUITfjBu')
ON CONFLICT (id) DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_annual_id = EXCLUDED.stripe_price_annual_id,
  stripe_price_monthly_id = EXCLUDED.stripe_price_monthly_id;

-- Trial tracking table (one trial per user ever)
CREATE TABLE IF NOT EXISTS user_trials (
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
CREATE TABLE IF NOT EXISTS community_subscriptions (
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
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('members', 'items', 'resources', 'storage_mb', 'admins')),
  current_value INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, metric)
);

-- Add-ons purchased
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL,
  addon_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_item_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
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
-- PART 2: MARKETPLACE TABLES
-- =====================================================

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
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
CREATE TABLE IF NOT EXISTS marketplace_transactions (
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
CREATE TABLE IF NOT EXISTS marketplace_fee_ledger (
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
-- PART 3: ADD-ON PRICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS addon_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_year INTEGER NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  metric_increase_type TEXT,
  metric_increase_amount INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert add-on prices with Stripe IDs
INSERT INTO addon_prices (addon_id, name, description, price_per_year, metric_increase_type, metric_increase_amount,
  stripe_product_id, stripe_price_id) VALUES
  ('extra_admin', 'Extra Admin', 'Add one additional admin to your community', 500, 'admins', 1,
    'prod_Tq1VLv7TTJgFXv', 'price_1SsLSIFCgCQzJKRs2uwI8il1'),
  ('extra_members_10', '10 Extra Members', 'Increase your member limit by 10', 300, 'members', 10,
    'prod_Tq1V0PCJl6vm1j', 'price_1SsLSJFCgCQzJKRsWpmlS6vc'),
  ('extra_items_20', '20 Extra Items', 'Increase your item limit by 20', 200, 'items', 20,
    'prod_Tq1VjXCctmkRb2', 'price_1SsLSJFCgCQzJKRs3pMLmnr6'),
  ('extra_resources_5', '5 Extra Resources', 'Add 5 more bookable resources', 300, 'resources', 5,
    'prod_Tq1Vt92QA3TBe4', 'price_1SsLSKFCgCQzJKRsVy30FqzI'),
  ('extra_storage_2gb', '2 GB Extra Storage', 'Increase your storage by 2 GB', 400, 'storage_mb', 2048,
    'prod_Tq1V1s1Se78riy', 'price_1SsLSKFCgCQzJKRssKkcLDPX'),
  ('marketplace', 'Marketplace', 'Enable buying and selling within your community', 500, NULL, NULL,
    'prod_Tq1ViHfYoHL08b', 'price_1SsLSLFCgCQzJKRssaH7gcmN'),
  ('custom_branding', 'Custom Branding', 'Add your logo and custom colors', 1000, NULL, NULL,
    'prod_Tq1V6Li6oORTS2', 'price_1SsLSLFCgCQzJKRsLucr88af'),
  ('priority_support', 'Priority Support', '12-hour response time guarantee', 1500, NULL, NULL,
    'prod_Tq1VSCDTqY4ZZa', 'price_1SsLSMFCgCQzJKRsr2BipEtK'),
  ('api_access', 'API Access', 'Developer API for custom integrations', 2500, NULL, NULL,
    'prod_Tq1V5GrKB2HzSN', 'price_1SsLSNFCgCQzJKRs34AkNLZG')
ON CONFLICT (addon_id) DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id;

-- =====================================================
-- PART 4: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_community_subscriptions_community ON community_subscriptions(community_id);
CREATE INDEX IF NOT EXISTS idx_community_subscriptions_stripe ON community_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_community_subscriptions_status ON community_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_community_subscriptions_trial ON community_subscriptions(is_trial, trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_user_trials_user ON user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_ends ON user_trials(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_community ON usage_tracking(community_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric ON usage_tracking(community_id, metric);
CREATE INDEX IF NOT EXISTS idx_billing_history_community ON billing_history(community_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_community ON subscription_addons(community_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_addon_id ON subscription_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_community ON marketplace_listings(community_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_fee_ledger_community ON marketplace_fee_ledger(community_id);
CREATE INDEX IF NOT EXISTS idx_addon_prices_addon_id ON addon_prices(addon_id);

-- =====================================================
-- PART 5: ROW LEVEL SECURITY
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
ALTER TABLE addon_prices ENABLE ROW LEVEL SECURITY;

-- Subscription tiers are public (read-only)
DROP POLICY IF EXISTS "Anyone can view subscription tiers" ON subscription_tiers;
CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers FOR SELECT
  USING (true);

-- Add-on prices are public (read-only)
DROP POLICY IF EXISTS "Anyone can view addon prices" ON addon_prices;
CREATE POLICY "Anyone can view addon prices"
  ON addon_prices FOR SELECT
  USING (true);

-- Users can view their own trial status
DROP POLICY IF EXISTS "Users can view own trial" ON user_trials;
CREATE POLICY "Users can view own trial"
  ON user_trials FOR SELECT
  USING (user_id = auth.uid());

-- Community admins can view their subscription
DROP POLICY IF EXISTS "Community admins can view subscription" ON community_subscriptions;
CREATE POLICY "Community admins can view subscription"
  ON community_subscriptions FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view usage tracking
DROP POLICY IF EXISTS "Community admins can view usage" ON usage_tracking;
CREATE POLICY "Community admins can view usage"
  ON usage_tracking FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view their add-ons
DROP POLICY IF EXISTS "Community admins can view addons" ON subscription_addons;
CREATE POLICY "Community admins can view addons"
  ON subscription_addons FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Community admins can view billing history
DROP POLICY IF EXISTS "Community admins can view billing history" ON billing_history;
CREATE POLICY "Community admins can view billing history"
  ON billing_history FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

-- Members can view marketplace listings in their community
DROP POLICY IF EXISTS "Members can view marketplace listings" ON marketplace_listings;
CREATE POLICY "Members can view marketplace listings"
  ON marketplace_listings FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can manage their own listings
DROP POLICY IF EXISTS "Users can manage own listings" ON marketplace_listings;
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
DROP POLICY IF EXISTS "Users can view own transactions" ON marketplace_transactions;
CREATE POLICY "Users can view own transactions"
  ON marketplace_transactions FOR SELECT
  USING (
    buyer_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR
    seller_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- PART 6: FUNCTIONS
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
-- PART 7: UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_subscriptions_timestamp ON community_subscriptions;
CREATE TRIGGER update_community_subscriptions_timestamp
  BEFORE UPDATE ON community_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_timestamp();

DROP TRIGGER IF EXISTS update_marketplace_listings_timestamp ON marketplace_listings;
CREATE TRIGGER update_marketplace_listings_timestamp
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_timestamp();

-- =====================================================
-- DONE!
-- =====================================================
SELECT 'Billing tables created successfully with Stripe IDs!' as result;
