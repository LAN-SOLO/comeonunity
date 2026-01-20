-- =====================================================
-- ComeOnUnity v2.0 - Storage Buckets and Policies
-- =====================================================

-- Create storage buckets
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

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Avatars bucket policies
-- Public read access
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "avatars_user_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own avatar
CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Community logos bucket policies
-- Public read access
CREATE POLICY "community_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-logos');

-- Community admins can upload logos
CREATE POLICY "community_logos_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-logos'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Community admins can update logos
CREATE POLICY "community_logos_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'community-logos'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Community admins can delete logos
CREATE POLICY "community_logos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'community-logos'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Item images bucket policies
-- Public read for community members
CREATE POLICY "item_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'item-images');

-- Members can upload item images
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

-- Item owners can update images
CREATE POLICY "item_images_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'item-images'
    AND EXISTS (
      SELECT 1 FROM items i
      JOIN community_members cm ON i.owner_id = cm.id
      WHERE i.id::text = (storage.foldername(name))[2]
      AND cm.user_id = auth.uid()
    )
  );

-- Item owners can delete images
CREATE POLICY "item_images_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-images'
    AND EXISTS (
      SELECT 1 FROM items i
      JOIN community_members cm ON i.owner_id = cm.id
      WHERE i.id::text = (storage.foldername(name))[2]
      AND cm.user_id = auth.uid()
    )
  );

-- Resource images bucket policies
-- Public read
CREATE POLICY "resource_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'resource-images');

-- Admins can manage resource images
CREATE POLICY "resource_images_admin_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'resource-images'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- News attachments bucket policies
-- Public read for community members
CREATE POLICY "news_attachments_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-attachments');

-- Moderators can manage news attachments
CREATE POLICY "news_attachments_mod_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'news-attachments'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND status = 'active'
    )
  );

-- Documents bucket policies (private)
-- Community members can read documents
CREATE POLICY "documents_member_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Admins can manage documents
CREATE POLICY "documents_admin_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Exports bucket policies (private)
-- Users can read their own exports
CREATE POLICY "exports_user_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- System can write exports (via service role)
CREATE POLICY "exports_system_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exports');
