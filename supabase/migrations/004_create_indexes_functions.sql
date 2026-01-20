-- =====================================================
-- ComeOnUnity v2.0 - Indexes and Functions
-- =====================================================

-- =====================================================
-- INDEXES FOR PERFORMANCE
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
CREATE INDEX IF NOT EXISTS idx_news_type ON news(type);

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
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'error', 'critical');

-- Moderation Reports
CREATE INDEX IF NOT EXISTS idx_moderation_reports_community ON moderation_reports(community_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON moderation_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_pending ON moderation_reports(community_id, status) WHERE status = 'pending';

-- Rate Limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, window_start DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_platform_analytics_date ON platform_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_community_analytics_community ON community_analytics(community_id, date DESC);

-- Data Export Requests
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

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
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
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

-- Update member last_active_at
CREATE OR REPLACE FUNCTION update_member_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_active_at for the member who performed the action
  UPDATE community_members
  SET last_active_at = NOW()
  WHERE user_id = auth.uid()
  AND community_id = COALESCE(NEW.community_id,
    (SELECT community_id FROM items WHERE id = NEW.item_id),
    (SELECT community_id FROM resources WHERE id = NEW.resource_id),
    (SELECT community_id FROM news WHERE id = NEW.news_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
  OR revoked_at IS NOT NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invites
  WHERE expires_at < NOW()
  OR (max_uses > 0 AND uses >= max_uses);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Mark overdue borrow requests
CREATE OR REPLACE FUNCTION mark_overdue_borrows()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE borrow_requests
  SET status = 'overdue'
  WHERE status = 'active'
  AND end_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR ACTIVITY TRACKING
-- =====================================================

-- Track activity on items
CREATE TRIGGER track_item_activity
  AFTER INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION update_member_activity();

-- Track activity on bookings
CREATE TRIGGER track_booking_activity
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_member_activity();

-- Track activity on borrow requests
CREATE TRIGGER track_borrow_activity
  AFTER INSERT ON borrow_requests
  FOR EACH ROW EXECUTE FUNCTION update_member_activity();

-- Track activity on news
CREATE TRIGGER track_news_activity
  AFTER INSERT ON news
  FOR EACH ROW EXECUTE FUNCTION update_member_activity();

-- Track activity on comments
CREATE TRIGGER track_comment_activity
  AFTER INSERT ON news_comments
  FOR EACH ROW EXECUTE FUNCTION update_member_activity();

-- =====================================================
-- BOOKING CONFLICT CHECK TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF check_booking_conflict(NEW.resource_id, NEW.starts_at, NEW.ends_at, NEW.id) THEN
    RAISE EXCEPTION 'Booking conflicts with an existing reservation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_booking_before_insert
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_booking_conflict();

CREATE TRIGGER check_booking_before_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at)
  EXECUTE FUNCTION prevent_booking_conflict();
