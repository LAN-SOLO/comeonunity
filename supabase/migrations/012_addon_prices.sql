-- =====================================================
-- ADD-ON PRICES TABLE
-- Maps add-on IDs to Stripe price IDs
-- =====================================================

-- Add-on prices reference table
CREATE TABLE addon_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_year INTEGER NOT NULL, -- cents
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  metric_increase_type TEXT, -- members, items, resources, admins, storage_mb
  metric_increase_amount INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert add-on prices
INSERT INTO addon_prices (addon_id, name, description, price_per_year, metric_increase_type, metric_increase_amount) VALUES
  ('extra_admin', 'Extra Admin', 'Add one additional admin to your community', 500, 'admins', 1),
  ('extra_members_10', '10 Extra Members', 'Increase your member limit by 10', 300, 'members', 10),
  ('extra_items_20', '20 Extra Items', 'Increase your item limit by 20', 200, 'items', 20),
  ('extra_resources_5', '5 Extra Resources', 'Add 5 more bookable resources', 300, 'resources', 5),
  ('extra_storage_2gb', '2 GB Extra Storage', 'Increase your storage by 2 GB', 400, 'storage_mb', 2048),
  ('marketplace', 'Marketplace', 'Enable buying and selling within your community', 500, NULL, NULL),
  ('custom_branding', 'Custom Branding', 'Add your logo and custom colors', 1000, NULL, NULL),
  ('priority_support', 'Priority Support', '12-hour response time guarantee', 1500, NULL, NULL),
  ('api_access', 'API Access', 'Developer API for custom integrations', 2500, NULL, NULL);

-- RLS
ALTER TABLE addon_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addon prices"
  ON addon_prices FOR SELECT
  USING (true);

-- Update subscription_addons table to use addon_id consistently
ALTER TABLE subscription_addons
  ADD COLUMN IF NOT EXISTS addon_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing addon_type data to addon_id
UPDATE subscription_addons SET addon_id = addon_type WHERE addon_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_addon_prices_addon_id ON addon_prices(addon_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_addon_id ON subscription_addons(addon_id);
