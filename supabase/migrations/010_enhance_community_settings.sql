-- =====================================================
-- ComeOnUnity v2.0 - Enhanced Community Settings
-- =====================================================

-- Add additional branding and customization columns to communities
ALTER TABLE communities ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#6366f1';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS community_rules TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Add announcement banner columns
ALTER TABLE communities ADD COLUMN IF NOT EXISTS announcement_text TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS announcement_link TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS announcement_active BOOLEAN DEFAULT false;

-- Create storage bucket for community assets (logos, covers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-assets',
  'community-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-assets
-- Public read access
CREATE POLICY "community_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-assets');

-- Admin upload access
CREATE POLICY "community_assets_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-assets'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );

-- Admin update access
CREATE POLICY "community_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'community-assets'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );

-- Admin delete access
CREATE POLICY "community_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-assets'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );

-- Default settings structure documentation:
-- settings JSONB will store:
-- {
--   "allow_member_invites": boolean,
--   "require_approval": boolean,
--   "show_member_directory": boolean,
--   "features": {
--     "items_enabled": boolean,
--     "events_enabled": boolean,
--     "news_enabled": boolean,
--     "resources_enabled": boolean,
--     "bookings_enabled": boolean
--   },
--   "moderation": {
--     "auto_approve_items": boolean,
--     "auto_approve_events": boolean
--   },
--   "notifications": {
--     "email_new_members": boolean,
--     "email_new_items": boolean,
--     "email_new_events": boolean
--   },
--   "display": {
--     "show_welcome_banner": boolean,
--     "show_activity_feed": boolean,
--     "show_quick_stats": boolean
--   }
-- }
