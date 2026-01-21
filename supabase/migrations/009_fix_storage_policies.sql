-- =====================================================
-- ComeOnUnity v2.0 - Fix Storage Policies
-- =====================================================

-- Drop existing item-images policies
DROP POLICY IF EXISTS "item_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "item_images_member_upload" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_delete" ON storage.objects;

-- Recreate with simpler, working policies

-- Public read access for item images
CREATE POLICY "item_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'item-images');

-- Authenticated users who are active community members can upload
-- File path format: {community_id}/{user_id}-{timestamp}-{random}.{ext}
CREATE POLICY "item_images_member_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can update their own uploaded images
CREATE POLICY "item_images_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can delete their own uploaded images
CREATE POLICY "item_images_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Also fix news-attachments policies
DROP POLICY IF EXISTS "news_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "news_attachments_mod_manage" ON storage.objects;

CREATE POLICY "news_attachments_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-attachments');

CREATE POLICY "news_attachments_member_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'news-attachments'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "news_attachments_mod_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'news-attachments'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "news_attachments_mod_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'news-attachments'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'moderator')
    )
  );

-- Fix resource-images policies
DROP POLICY IF EXISTS "resource_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "resource_images_admin_manage" ON storage.objects;

CREATE POLICY "resource_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'resource-images');

CREATE POLICY "resource_images_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );

CREATE POLICY "resource_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );

CREATE POLICY "resource_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  );
