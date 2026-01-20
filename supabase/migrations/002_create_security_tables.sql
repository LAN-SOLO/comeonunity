-- =====================================================
-- ComeOnUnity v2.0 - Security Tables Migration
-- =====================================================

-- User Profiles (Extended auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,

  -- 2FA
  totp_secret TEXT,              -- Encrypted TOTP secret
  totp_enabled BOOLEAN DEFAULT FALSE,
  recovery_codes TEXT[],         -- Encrypted recovery codes

  -- Security Settings
  require_2fa BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMPTZ,
  password_reset_required BOOLEAN DEFAULT FALSE,

  -- Preferences
  locale TEXT DEFAULT 'de',
  timezone TEXT DEFAULT 'Europe/Berlin',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,

  -- Platform Role
  platform_role TEXT DEFAULT 'user' CHECK (platform_role IN ('user', 'support', 'admin', 'superadmin')),

  -- Account Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Session Info
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,            -- { browser, os, device }
  ip_address INET,
  location TEXT,                -- Geo-located

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Context
  community_id UUID REFERENCES communities ON DELETE SET NULL,

  -- Event
  action TEXT NOT NULL,          -- 'member.invite', 'item.create', 'booking.cancel', etc.
  resource_type TEXT NOT NULL,   -- 'member', 'item', 'booking', 'resource', 'news', etc.
  resource_id UUID,

  -- Details
  details JSONB,                 -- Action-specific data
  previous_state JSONB,          -- For update actions
  new_state JSONB,               -- For update actions

  -- Metadata
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation Reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES community_members ON DELETE SET NULL,

  -- Target
  target_type TEXT NOT NULL CHECK (target_type IN ('member', 'item', 'news', 'comment', 'booking')),
  target_id UUID NOT NULL,

  -- Report Details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'dangerous', 'other')),
  description TEXT,

  -- Resolution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES community_members,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting (for API abuse prevention)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key TEXT NOT NULL,             -- 'ip:192.168.1.1', 'user:uuid', 'api:endpoint'
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,

  UNIQUE(key, window_start)
);

-- Platform Analytics (aggregated)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  date DATE NOT NULL,

  -- User Metrics
  total_users INTEGER DEFAULT 0,
  active_users_daily INTEGER DEFAULT 0,
  active_users_weekly INTEGER DEFAULT 0,
  active_users_monthly INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,

  -- Community Metrics
  total_communities INTEGER DEFAULT 0,
  active_communities INTEGER DEFAULT 0,
  new_communities INTEGER DEFAULT 0,

  -- Feature Usage
  items_created INTEGER DEFAULT 0,
  borrow_requests INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  news_posts INTEGER DEFAULT 0,

  -- Revenue (for super admin)
  mrr_cents INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

-- Community Analytics
CREATE TABLE IF NOT EXISTS community_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Member Metrics
  total_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,

  -- Feature Usage
  items_listed INTEGER DEFAULT 0,
  borrow_requests INTEGER DEFAULT 0,
  bookings_made INTEGER DEFAULT 0,
  news_posts INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(community_id, date)
);

-- Data Export Requests (GDPR)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),

  -- Export Details
  export_format TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'csv')),
  download_url TEXT,
  expires_at TIMESTAMPTZ,

  -- Processing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger to user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
