-- =====================================================
-- DEVELOPER SYSTEM MIGRATION
-- Secure developer access and testing infrastructure
-- =====================================================

-- Developer users table (highly restricted)
CREATE TABLE IF NOT EXISTS developer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  developer_key UUID NOT NULL DEFAULT gen_random_uuid(),
  access_level TEXT NOT NULL DEFAULT 'developer' CHECK (access_level IN ('developer', 'master', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_test_plans BOOLEAN NOT NULL DEFAULT true,
  can_simulate_subscriptions BOOLEAN NOT NULL DEFAULT true,
  can_access_all_communities BOOLEAN NOT NULL DEFAULT false,
  last_dev_access TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developer audit log (tracks all dev actions)
CREATE TABLE IF NOT EXISTS developer_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developer_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developer test subscriptions (simulated plans for testing)
CREATE TABLE IF NOT EXISTS developer_test_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developer_users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  simulated_tier_id TEXT NOT NULL,
  simulated_status TEXT NOT NULL DEFAULT 'active',
  simulated_features JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(developer_id, community_id)
);

-- Secure developer documentation (encrypted storage)
CREATE TABLE IF NOT EXISTS developer_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developer_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_encrypted TEXT NOT NULL, -- AES-256 encrypted content
  encryption_iv TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_sensitive BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_users_user_id ON developer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_users_email ON developer_users(email);
CREATE INDEX IF NOT EXISTS idx_developer_audit_log_developer ON developer_audit_log(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_audit_log_created ON developer_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_test_subs_developer ON developer_test_subscriptions(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_docs_developer ON developer_docs(developer_id);

-- RLS Policies (extremely restrictive)
ALTER TABLE developer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_test_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_docs ENABLE ROW LEVEL SECURITY;

-- Only the developer can see their own record
CREATE POLICY "Developers can view own record"
  ON developer_users FOR SELECT
  USING (user_id = auth.uid() AND is_active = true);

-- No direct inserts/updates from client (only via admin functions)
CREATE POLICY "No direct developer inserts"
  ON developer_users FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct developer updates"
  ON developer_users FOR UPDATE
  USING (false);

-- Audit log: developers can view their own logs
CREATE POLICY "Developers can view own audit logs"
  ON developer_audit_log FOR SELECT
  USING (
    developer_id IN (
      SELECT id FROM developer_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Test subscriptions: developers can manage their own
CREATE POLICY "Developers can view own test subscriptions"
  ON developer_test_subscriptions FOR SELECT
  USING (
    developer_id IN (
      SELECT id FROM developer_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Developers can manage own test subscriptions"
  ON developer_test_subscriptions FOR ALL
  USING (
    developer_id IN (
      SELECT id FROM developer_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Developer docs: only the owner can access
CREATE POLICY "Developers can access own docs"
  ON developer_docs FOR ALL
  USING (
    developer_id IN (
      SELECT id FROM developer_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Helper function: Check if user is a developer
CREATE OR REPLACE FUNCTION is_developer(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM developer_users
    WHERE user_id = p_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get developer access level
CREATE OR REPLACE FUNCTION get_developer_level(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  v_level TEXT;
BEGIN
  SELECT access_level INTO v_level
  FROM developer_users
  WHERE user_id = p_user_id AND is_active = true;

  RETURN COALESCE(v_level, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Log developer action
CREATE OR REPLACE FUNCTION log_developer_action(
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_developer_id UUID;
  v_log_id UUID;
BEGIN
  SELECT id INTO v_developer_id
  FROM developer_users
  WHERE user_id = auth.uid() AND is_active = true;

  IF v_developer_id IS NULL THEN
    RAISE EXCEPTION 'Not a developer';
  END IF;

  INSERT INTO developer_audit_log (developer_id, action, details, ip_address, user_agent)
  VALUES (v_developer_id, p_action, p_details, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;

  -- Update last access
  UPDATE developer_users SET last_dev_access = now() WHERE id = v_developer_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL MASTER DEVELOPER SETUP
-- buero@lan-solo.de as master developer
-- =====================================================

-- This will be executed when the user exists
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'buero@lan-solo.de';

  IF v_user_id IS NOT NULL THEN
    -- Insert master developer record
    INSERT INTO developer_users (
      user_id,
      email,
      access_level,
      is_active,
      can_test_plans,
      can_simulate_subscriptions,
      can_access_all_communities
    ) VALUES (
      v_user_id,
      'buero@lan-solo.de',
      'master',
      true,
      true,
      true,
      true
    )
    ON CONFLICT (email) DO UPDATE SET
      access_level = 'master',
      is_active = true,
      can_test_plans = true,
      can_simulate_subscriptions = true,
      can_access_all_communities = true,
      updated_at = now();

    RAISE NOTICE 'Master developer created/updated for buero@lan-solo.de';
  ELSE
    RAISE NOTICE 'User buero@lan-solo.de not found - will be added when user logs in';
  END IF;
END $$;

-- Trigger to auto-setup developer on first login (for the master email only)
CREATE OR REPLACE FUNCTION setup_master_developer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'buero@lan-solo.de' THEN
    INSERT INTO developer_users (
      user_id,
      email,
      access_level,
      is_active,
      can_test_plans,
      can_simulate_subscriptions,
      can_access_all_communities
    ) VALUES (
      NEW.id,
      NEW.email,
      'master',
      true,
      true,
      true,
      true
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      access_level = 'master',
      is_active = true,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created_developer ON auth.users;
CREATE TRIGGER on_auth_user_created_developer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION setup_master_developer();
