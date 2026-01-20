-- =====================================================
-- ComeOnUnity v2.0 - COMBINED DATABASE MIGRATION
-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/pnswkyciqbrxfazltqqq/sql
-- =====================================================

-- =====================================================
-- PART 1: CORE TABLES
-- =====================================================

-- Communities (Multi-tenant root)
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('weg', 'house', 'neighborhood', 'cohousing', 'interest')),
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'DE',
  locale TEXT DEFAULT 'de',
  timezone TEXT DEFAULT 'Europe/Berlin',

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#007AFF',

  -- Billing
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'community', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),

  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Members
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),

  -- Profile
  display_name TEXT,
  unit_number TEXT,
  phone TEXT,
  show_phone BOOLEAN DEFAULT FALSE,
  show_email BOOLEAN DEFAULT TRUE,
  bio TEXT,
  avatar_url TEXT,

  -- Skills
  skills TEXT[],
  skills_description TEXT,
  available_for_help BOOLEAN DEFAULT TRUE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES community_members,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  UNIQUE(community_id, user_id)
);

-- Items (Lending Library)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  category TEXT NOT NULL,
  images TEXT[],

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'unavailable', 'damaged')),
  condition TEXT DEFAULT 'good',

  requires_approval BOOLEAN DEFAULT TRUE,
  max_borrow_days INTEGER DEFAULT 7,
  deposit_amount INTEGER,
  notes TEXT,
  pickup_location TEXT,

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES community_members,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (Bookable)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('room', 'vehicle', 'equipment', 'space', 'other')),
  images TEXT[],

  booking_type TEXT DEFAULT 'slot' CHECK (booking_type IN ('slot', 'day', 'flexible')),
  slot_duration_minutes INTEGER DEFAULT 60,
  min_advance_hours INTEGER DEFAULT 1,
  max_advance_days INTEGER DEFAULT 30,
  max_duration_hours INTEGER,

  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0],
  available_from TIME DEFAULT '08:00',
  available_until TIME DEFAULT '22:00',

  requires_approval BOOLEAN DEFAULT FALSE,
  rules TEXT,
  capacity INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  notes TEXT,
  attendees INTEGER,

  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),

  recurring_rule TEXT,
  parent_booking_id UUID REFERENCES bookings,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

-- Borrow Requests
CREATE TABLE IF NOT EXISTS borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items ON DELETE CASCADE NOT NULL,
  borrower_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'active', 'returned', 'overdue')),

  owner_response TEXT,
  responded_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  return_condition TEXT,
  return_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES community_members ON DELETE SET NULL,

  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  content_html TEXT,

  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'announcement', 'update', 'important', 'event', 'maintenance', 'social')),
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  attachments JSONB,
  allow_comments BOOLEAN DEFAULT TRUE,

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News Comments
CREATE TABLE IF NOT EXISTS news_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES news ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES community_members ON DELETE SET NULL,

  content TEXT NOT NULL,
  parent_id UUID REFERENCES news_comments ON DELETE CASCADE,

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,

  code TEXT UNIQUE NOT NULL,
  email TEXT,

  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES community_members,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,
  community_id UUID REFERENCES communities ON DELETE CASCADE,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  link TEXT,

  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (Community Calendar)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES community_members ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'Europe/Berlin',

  -- Recurrence
  recurring_rule TEXT,
  parent_event_id UUID REFERENCES events ON DELETE CASCADE,

  -- Type and category
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'meeting', 'maintenance', 'social', 'workshop', 'other')),
  category TEXT,
  color TEXT DEFAULT '#3B82F6',

  -- Images
  cover_image_url TEXT,
  images TEXT[],

  -- RSVP settings
  rsvp_enabled BOOLEAN DEFAULT TRUE,
  max_attendees INTEGER,
  rsvp_deadline TIMESTAMPTZ,

  -- Visibility
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'members', 'admins')),

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'cancelled', 'completed')),
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  guests INTEGER DEFAULT 0,
  note TEXT,

  responded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, member_id)
);

-- =====================================================
-- PART 2: SECURITY TABLES
-- =====================================================

-- User Profiles (Extended auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,

  -- 2FA
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT FALSE,
  recovery_codes TEXT[],

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

  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  location TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,

  community_id UUID REFERENCES communities ON DELETE SET NULL,

  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,

  details JSONB,
  previous_state JSONB,
  new_state JSONB,

  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation Reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES community_members ON DELETE SET NULL,

  target_type TEXT NOT NULL CHECK (target_type IN ('member', 'item', 'news', 'comment', 'booking')),
  target_id UUID NOT NULL,

  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'dangerous', 'other')),
  description TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES community_members,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,

  UNIQUE(key, window_start)
);

-- Platform Analytics
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  date DATE NOT NULL,

  total_users INTEGER DEFAULT 0,
  active_users_daily INTEGER DEFAULT 0,
  active_users_weekly INTEGER DEFAULT 0,
  active_users_monthly INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,

  total_communities INTEGER DEFAULT 0,
  active_communities INTEGER DEFAULT 0,
  new_communities INTEGER DEFAULT 0,

  items_created INTEGER DEFAULT 0,
  borrow_requests INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  news_posts INTEGER DEFAULT 0,

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

  total_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,

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

  export_format TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'csv')),
  download_url TEXT,
  expires_at TIMESTAMPTZ,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 3: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (drop if exists first)
DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_comments_updated_at ON news_comments;
CREATE TRIGGER update_news_comments_updated_at
  BEFORE UPDATE ON news_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================

-- Check if user is a member of a community
CREATE OR REPLACE FUNCTION is_community_member(community_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin of a community
CREATE OR REPLACE FUNCTION is_community_admin(community_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is moderator or admin of a community
CREATE OR REPLACE FUNCTION is_community_moderator(community_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = auth.uid()
    AND role IN ('admin', 'moderator')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND platform_role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate community slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM communities WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE resource_id = p_resource_id
    AND status != 'cancelled'
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (starts_at, ends_at) OVERLAPS (p_starts_at, p_ends_at)
  );
END;
$$ LANGUAGE plpgsql;

-- Get member's community role
CREATE OR REPLACE FUNCTION get_member_role(p_community_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  member_role TEXT;
BEGIN
  SELECT role INTO member_role
  FROM community_members
  WHERE community_id = p_community_id
  AND user_id = p_user_id
  AND status = 'active';

  RETURN member_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent booking conflicts
CREATE OR REPLACE FUNCTION prevent_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF check_booking_conflict(NEW.resource_id, NEW.starts_at, NEW.ends_at, NEW.id) THEN
    RAISE EXCEPTION 'Booking conflicts with an existing reservation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_booking_before_insert ON bookings;
CREATE TRIGGER check_booking_before_insert
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_booking_conflict();

DROP TRIGGER IF EXISTS check_booking_before_update ON bookings;
CREATE TRIGGER check_booking_before_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at)
  EXECUTE FUNCTION prevent_booking_conflict();

-- =====================================================
-- PART 5: INDEXES
-- =====================================================

-- Communities
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_status ON communities(status);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);

-- Community Members
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members(status);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);
CREATE INDEX IF NOT EXISTS idx_community_members_last_active ON community_members(last_active_at DESC);

-- Items
CREATE INDEX IF NOT EXISTS idx_items_community ON items(community_id);
CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_flagged ON items(flagged) WHERE flagged = true;

-- Resources
CREATE INDEX IF NOT EXISTS idx_resources_community ON resources(community_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_starts_at ON bookings(starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings(resource_id, starts_at, ends_at);

-- Borrow Requests
CREATE INDEX IF NOT EXISTS idx_borrow_requests_item ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_dates ON borrow_requests(start_date, end_date);

-- News
CREATE INDEX IF NOT EXISTS idx_news_community ON news(community_id);
CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_pinned ON news(community_id, pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);

-- News Comments
CREATE INDEX IF NOT EXISTS idx_news_comments_news ON news_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_author ON news_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_parent ON news_comments(parent_id);

-- Invites
CREATE INDEX IF NOT EXISTS idx_invites_community ON invites(community_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites(expires_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member ON event_rsvps(member_id);

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_platform_role ON user_profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- User Sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, revoked_at) WHERE revoked_at IS NULL;

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_community ON audit_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Moderation Reports
CREATE INDEX IF NOT EXISTS idx_moderation_reports_community ON moderation_reports(community_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON moderation_reports(target_type, target_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_platform_analytics_date ON platform_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_community_analytics_community ON community_analytics(community_id, date DESC);

-- Data Export Requests
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

-- Rate Limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, window_start DESC);

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- COMMUNITY POLICIES
CREATE POLICY "members_view_communities" ON communities
  FOR SELECT USING (is_community_member(id) OR is_platform_admin());

CREATE POLICY "public_view_community_basic" ON communities
  FOR SELECT USING (status = 'active');

CREATE POLICY "admins_update_communities" ON communities
  FOR UPDATE USING (is_community_admin(id) OR is_platform_admin());

CREATE POLICY "users_create_communities" ON communities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MEMBER POLICIES
CREATE POLICY "members_view_members" ON community_members
  FOR SELECT USING (is_community_member(community_id) OR is_platform_admin());

CREATE POLICY "members_update_own" ON community_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admins_update_members" ON community_members
  FOR UPDATE USING (is_community_admin(community_id));

CREATE POLICY "admins_insert_members" ON community_members
  FOR INSERT WITH CHECK (
    is_community_admin(community_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "admins_delete_members" ON community_members
  FOR DELETE USING (is_community_admin(community_id) AND user_id != auth.uid());

-- ITEM POLICIES
CREATE POLICY "members_view_items" ON items
  FOR SELECT USING (is_community_member(community_id));

CREATE POLICY "members_create_items" ON items
  FOR INSERT WITH CHECK (
    is_community_member(community_id)
    AND owner_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND community_id = items.community_id
    )
  );

CREATE POLICY "owners_update_items" ON items
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
    OR is_community_moderator(community_id)
  );

CREATE POLICY "owners_delete_items" ON items
  FOR DELETE USING (
    owner_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
    OR is_community_admin(community_id)
  );

-- BORROW REQUEST POLICIES
CREATE POLICY "members_view_borrow_requests" ON borrow_requests
  FOR SELECT USING (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR item_id IN (
      SELECT id FROM items WHERE owner_id IN (
        SELECT id FROM community_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "members_create_borrow_requests" ON borrow_requests
  FOR INSERT WITH CHECK (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "parties_update_borrow_requests" ON borrow_requests
  FOR UPDATE USING (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR item_id IN (
      SELECT id FROM items WHERE owner_id IN (
        SELECT id FROM community_members WHERE user_id = auth.uid()
      )
    )
  );

-- RESOURCE POLICIES
CREATE POLICY "members_view_resources" ON resources
  FOR SELECT USING (is_community_member(community_id));

CREATE POLICY "admins_manage_resources" ON resources
  FOR ALL USING (is_community_admin(community_id));

-- BOOKING POLICIES
CREATE POLICY "members_view_bookings" ON bookings
  FOR SELECT USING (
    resource_id IN (
      SELECT id FROM resources WHERE is_community_member(community_id)
    )
  );

CREATE POLICY "members_create_bookings" ON bookings
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members_update_own_bookings" ON bookings
  FOR UPDATE USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR resource_id IN (
      SELECT id FROM resources WHERE is_community_admin(community_id)
    )
  );

-- NEWS POLICIES
CREATE POLICY "members_view_news" ON news
  FOR SELECT USING (is_community_member(community_id));

CREATE POLICY "mods_create_news" ON news
  FOR INSERT WITH CHECK (is_community_moderator(community_id));

CREATE POLICY "mods_update_news" ON news
  FOR UPDATE USING (is_community_moderator(community_id));

CREATE POLICY "admins_delete_news" ON news
  FOR DELETE USING (is_community_admin(community_id));

-- NEWS COMMENTS POLICIES
CREATE POLICY "members_view_comments" ON news_comments
  FOR SELECT USING (
    news_id IN (
      SELECT id FROM news WHERE is_community_member(community_id)
    )
  );

CREATE POLICY "members_create_comments" ON news_comments
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "authors_update_comments" ON news_comments
  FOR UPDATE USING (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "authors_mods_delete_comments" ON news_comments
  FOR DELETE USING (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR news_id IN (
      SELECT id FROM news WHERE is_community_moderator(community_id)
    )
  );

-- INVITE POLICIES
CREATE POLICY "admins_view_invites" ON invites
  FOR SELECT USING (is_community_admin(community_id));

CREATE POLICY "public_view_invite_by_code" ON invites
  FOR SELECT USING (true);

CREATE POLICY "admins_create_invites" ON invites
  FOR INSERT WITH CHECK (is_community_admin(community_id));

CREATE POLICY "public_update_invites" ON invites
  FOR UPDATE USING (true);

-- NOTIFICATION POLICIES
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (
    user_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

CREATE POLICY "system_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_delete_own_notifications" ON notifications
  FOR DELETE USING (
    user_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- EVENT POLICIES
CREATE POLICY "Members can view events in their community"
  ON events FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins and moderators can create events"
  ON events FOR INSERT
  WITH CHECK (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins, moderators and organizers can update events"
  ON events FOR UPDATE
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
    OR organizer_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins and moderators can delete events"
  ON events FOR DELETE
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
  );

-- EVENT RSVP POLICIES
CREATE POLICY "Members can view RSVPs for events in their community"
  ON event_rsvps FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE community_id IN (
        SELECT community_id FROM community_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Members can manage their own RSVPs"
  ON event_rsvps FOR ALL
  USING (
    member_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- USER PROFILE POLICIES
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "platform_admins_view_profiles" ON user_profiles
  FOR SELECT USING (is_platform_admin());

-- USER SESSION POLICIES
CREATE POLICY "users_own_sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- AUDIT LOG POLICIES
CREATE POLICY "admins_view_audit_logs" ON audit_logs
  FOR SELECT USING (
    (community_id IS NOT NULL AND is_community_admin(community_id))
    OR is_platform_admin()
  );

CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- MODERATION REPORT POLICIES
CREATE POLICY "mods_view_reports" ON moderation_reports
  FOR SELECT USING (is_community_moderator(community_id));

CREATE POLICY "members_create_reports" ON moderation_reports
  FOR INSERT WITH CHECK (is_community_member(community_id));

CREATE POLICY "mods_update_reports" ON moderation_reports
  FOR UPDATE USING (is_community_moderator(community_id));

-- ANALYTICS POLICIES
CREATE POLICY "platform_admins_view_platform_analytics" ON platform_analytics
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "admins_view_community_analytics" ON community_analytics
  FOR SELECT USING (is_community_admin(community_id));

-- DATA EXPORT REQUEST POLICIES
CREATE POLICY "users_own_export_requests" ON data_export_requests
  FOR ALL USING (user_id = auth.uid());

-- RATE LIMIT POLICIES
CREATE POLICY "service_role_rate_limits" ON rate_limits
  FOR ALL USING (false);

-- =====================================================
-- PART 7: STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('community-logos', 'community-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('item-images', 'item-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('resource-images', 'resource-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('news-attachments', 'news-attachments', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('exports', 'exports', false, 104857600, ARRAY['application/json', 'application/zip', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "community_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-logos');

CREATE POLICY "item_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'item-images');

CREATE POLICY "item_images_member_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-images'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "resource_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'resource-images');

CREATE POLICY "news_attachments_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-attachments');

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
