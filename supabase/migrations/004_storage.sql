-- ============================================================================
-- RoomMark: 004_storage.sql
-- Storage buckets for inspection photos and PDFs with RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bucket: inspection-photos
-- Private, max 10 MB, JPEG and PNG only
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  false,
  10485760,                    -- 10 MB in bytes
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Bucket: inspection-pdfs
-- Private, max 50 MB, PDF only
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-pdfs',
  'inspection-pdfs',
  false,
  52428800,                    -- 50 MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- RLS: inspection-photos
-- Path format: {user_id}/{inspection_id}/{filename}
-- Only the owner (first path segment) can access their own files.
-- ----------------------------------------------------------------------------

-- SELECT: user can read files in their own folder
CREATE POLICY "photos_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inspection-photos'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- INSERT: user can upload into their own folder
CREATE POLICY "photos_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- UPDATE: user can update their own files
CREATE POLICY "photos_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'inspection-photos'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- DELETE: user can delete their own files
CREATE POLICY "photos_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inspection-photos'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- RLS: inspection-pdfs
-- Same path-based ownership model
-- ----------------------------------------------------------------------------

-- SELECT
CREATE POLICY "pdfs_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inspection-pdfs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- INSERT
CREATE POLICY "pdfs_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-pdfs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- UPDATE
CREATE POLICY "pdfs_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'inspection-pdfs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'inspection-pdfs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- DELETE
CREATE POLICY "pdfs_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inspection-pdfs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );
