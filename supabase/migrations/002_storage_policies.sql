-- ============================================================
-- Migration 002: Supabase Storage — Private bucket + RLS policies
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================
-- Creates a private 'documents' bucket for storing generated
-- LLP agreements (PDF, DOCX). Files are stored in user-scoped
-- folders: {user_id}/{filename}
--
-- Bucket is PRIVATE — no public URLs. All access via signed URLs.
-- ============================================================

-- 1. Create the private bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,                          -- PRIVATE: no public access
  10485760,                       -- 10 MB max file size
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,                 -- Ensure it's always private
  file_size_limit = 10485760;

-- ────────────────────────────────────────────────────────────
-- 2. Storage RLS Policies
-- ────────────────────────────────────────────────────────────
-- Files are stored as: documents/{user_id}/{filename}
-- Policies ensure users can only access their own folder.

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "Users can upload own files"   ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files"     ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files"   ON storage.objects;

-- INSERT: Users can upload files only to their own folder
CREATE POLICY "Users can upload own files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: Users can view/download only their own files
CREATE POLICY "Users can view own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Users can overwrite only their own files
CREATE POLICY "Users can update own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Users can delete only their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────
-- VERIFICATION
-- ────────────────────────────────────────────────────────────
--
-- 1. Check bucket exists and is private:
--    SELECT id, name, public, file_size_limit
--    FROM storage.buckets WHERE id = 'documents';
--    -- Expected: public = false
--
-- 2. Check storage policies:
--    SELECT policyname, cmd
--    FROM pg_policies
--    WHERE tablename = 'objects' AND schemaname = 'storage';
--    -- Expected: 4 policies for documents bucket
-- ────────────────────────────────────────────────────────────
