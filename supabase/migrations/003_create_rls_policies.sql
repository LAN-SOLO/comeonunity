-- =====================================================
-- ComeOnUnity v2.0 - Row Level Security Policies
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
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
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

-- =====================================================
-- COMMUNITY POLICIES
-- =====================================================

-- Members can view communities they belong to
CREATE POLICY "members_view_communities" ON communities
  FOR SELECT USING (is_community_member(id) OR is_platform_admin());

-- Anyone can view public community info (for joining)
CREATE POLICY "public_view_community_basic" ON communities
  FOR SELECT USING (status = 'active');

-- Only admins can update their communities
CREATE POLICY "admins_update_communities" ON communities
  FOR UPDATE USING (is_community_admin(id) OR is_platform_admin());

-- Authenticated users can create communities
CREATE POLICY "users_create_communities" ON communities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- MEMBER POLICIES
-- =====================================================

-- Members can view other members in their communities
CREATE POLICY "members_view_members" ON community_members
  FOR SELECT USING (is_community_member(community_id) OR is_platform_admin());

-- Members can update their own profile
CREATE POLICY "members_update_own" ON community_members
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can update any member in their community
CREATE POLICY "admins_update_members" ON community_members
  FOR UPDATE USING (is_community_admin(community_id));

-- Admins can insert members (invite)
CREATE POLICY "admins_insert_members" ON community_members
  FOR INSERT WITH CHECK (
    is_community_admin(community_id)
    OR user_id = auth.uid() -- User joining themselves via invite
  );

-- Admins can delete members (remove from community)
CREATE POLICY "admins_delete_members" ON community_members
  FOR DELETE USING (is_community_admin(community_id) AND user_id != auth.uid());

-- =====================================================
-- ITEM POLICIES
-- =====================================================

-- Members can view items in their communities
CREATE POLICY "members_view_items" ON items
  FOR SELECT USING (is_community_member(community_id));

-- Members can create items
CREATE POLICY "members_create_items" ON items
  FOR INSERT WITH CHECK (
    is_community_member(community_id)
    AND owner_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND community_id = items.community_id
    )
  );

-- Owners can update their items
CREATE POLICY "owners_update_items" ON items
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
    OR is_community_moderator(community_id)
  );

-- Owners can delete their items
CREATE POLICY "owners_delete_items" ON items
  FOR DELETE USING (
    owner_id IN (
      SELECT id FROM community_members WHERE user_id = auth.uid()
    )
    OR is_community_admin(community_id)
  );

-- =====================================================
-- BORROW REQUEST POLICIES
-- =====================================================

-- Members can view borrow requests they're involved in
CREATE POLICY "members_view_borrow_requests" ON borrow_requests
  FOR SELECT USING (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR item_id IN (
      SELECT id FROM items WHERE owner_id IN (
        SELECT id FROM community_members WHERE user_id = auth.uid()
      )
    )
  );

-- Members can create borrow requests
CREATE POLICY "members_create_borrow_requests" ON borrow_requests
  FOR INSERT WITH CHECK (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- Owners and borrowers can update requests
CREATE POLICY "parties_update_borrow_requests" ON borrow_requests
  FOR UPDATE USING (
    borrower_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR item_id IN (
      SELECT id FROM items WHERE owner_id IN (
        SELECT id FROM community_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RESOURCE POLICIES
-- =====================================================

-- Members can view resources in their communities
CREATE POLICY "members_view_resources" ON resources
  FOR SELECT USING (is_community_member(community_id));

-- Admins can manage resources
CREATE POLICY "admins_manage_resources" ON resources
  FOR ALL USING (is_community_admin(community_id));

-- =====================================================
-- BOOKING POLICIES
-- =====================================================

-- Members can view bookings for resources in their communities
CREATE POLICY "members_view_bookings" ON bookings
  FOR SELECT USING (
    resource_id IN (
      SELECT id FROM resources WHERE is_community_member(community_id)
    )
  );

-- Members can create bookings
CREATE POLICY "members_create_bookings" ON bookings
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- Members can update/cancel their own bookings
CREATE POLICY "members_update_own_bookings" ON bookings
  FOR UPDATE USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR resource_id IN (
      SELECT id FROM resources WHERE is_community_admin(community_id)
    )
  );

-- =====================================================
-- NEWS POLICIES
-- =====================================================

-- Members can view news in their communities
CREATE POLICY "members_view_news" ON news
  FOR SELECT USING (is_community_member(community_id));

-- Admins/moderators can create news
CREATE POLICY "mods_create_news" ON news
  FOR INSERT WITH CHECK (is_community_moderator(community_id));

-- Admins/moderators can update news
CREATE POLICY "mods_update_news" ON news
  FOR UPDATE USING (is_community_moderator(community_id));

-- Admins can delete news
CREATE POLICY "admins_delete_news" ON news
  FOR DELETE USING (is_community_admin(community_id));

-- =====================================================
-- NEWS COMMENTS POLICIES
-- =====================================================

-- Members can view comments
CREATE POLICY "members_view_comments" ON news_comments
  FOR SELECT USING (
    news_id IN (
      SELECT id FROM news WHERE is_community_member(community_id)
    )
  );

-- Members can create comments
CREATE POLICY "members_create_comments" ON news_comments
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- Authors can update their comments
CREATE POLICY "authors_update_comments" ON news_comments
  FOR UPDATE USING (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
  );

-- Authors and mods can delete comments
CREATE POLICY "authors_mods_delete_comments" ON news_comments
  FOR DELETE USING (
    author_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR news_id IN (
      SELECT id FROM news WHERE is_community_moderator(community_id)
    )
  );

-- =====================================================
-- INVITE POLICIES
-- =====================================================

-- Admins can view invites
CREATE POLICY "admins_view_invites" ON invites
  FOR SELECT USING (is_community_admin(community_id));

-- Anyone can view invite by code (for joining)
CREATE POLICY "public_view_invite_by_code" ON invites
  FOR SELECT USING (true);

-- Admins can create invites
CREATE POLICY "admins_create_invites" ON invites
  FOR INSERT WITH CHECK (is_community_admin(community_id));

-- Anyone can update invite (increment uses)
CREATE POLICY "public_update_invites" ON invites
  FOR UPDATE USING (true);

-- =====================================================
-- NOTIFICATION POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark read)
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "system_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- USER PROFILE POLICIES
-- =====================================================

-- Users can view and manage their own profile
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- Platform admins can view all profiles
CREATE POLICY "platform_admins_view_profiles" ON user_profiles
  FOR SELECT USING (is_platform_admin());

-- =====================================================
-- USER SESSION POLICIES
-- =====================================================

-- Users can view and revoke their own sessions
CREATE POLICY "users_own_sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- AUDIT LOG POLICIES
-- =====================================================

-- Community admins can view their community's audit logs
CREATE POLICY "admins_view_audit_logs" ON audit_logs
  FOR SELECT USING (
    (community_id IS NOT NULL AND is_community_admin(community_id))
    OR is_platform_admin()
  );

-- System can insert audit logs
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- MODERATION REPORT POLICIES
-- =====================================================

-- Admins/mods can view reports in their community
CREATE POLICY "mods_view_reports" ON moderation_reports
  FOR SELECT USING (is_community_moderator(community_id));

-- Members can create reports
CREATE POLICY "members_create_reports" ON moderation_reports
  FOR INSERT WITH CHECK (is_community_member(community_id));

-- Mods can update reports (resolve)
CREATE POLICY "mods_update_reports" ON moderation_reports
  FOR UPDATE USING (is_community_moderator(community_id));

-- =====================================================
-- ANALYTICS POLICIES
-- =====================================================

-- Platform admins can view platform analytics
CREATE POLICY "platform_admins_view_platform_analytics" ON platform_analytics
  FOR SELECT USING (is_platform_admin());

-- Community admins can view their community analytics
CREATE POLICY "admins_view_community_analytics" ON community_analytics
  FOR SELECT USING (is_community_admin(community_id));

-- =====================================================
-- DATA EXPORT REQUEST POLICIES
-- =====================================================

-- Users can view and manage their own export requests
CREATE POLICY "users_own_export_requests" ON data_export_requests
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- RATE LIMIT POLICIES (Service role only)
-- =====================================================

-- Only service role can access rate limits
CREATE POLICY "service_role_rate_limits" ON rate_limits
  FOR ALL USING (false);
