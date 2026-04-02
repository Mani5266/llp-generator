-- ================================================================
-- LLP Agreement Generator — Complete Database Setup (No Auth)
-- Single file containing ALL SQL queries for Supabase
-- Run this in Supabase Dashboard > SQL Editor (in order)
-- ================================================================
-- 
-- Tables Created:
--   1. public.agreements     — Stores LLP agreement drafts
--   2. storage.buckets       — Private 'documents' bucket
--
-- Functions Created:
--   1. public.cleanup_expired_data() — Data retention cleanup
--
-- NOTE: Authentication, RLS, and audit_logs have been removed.
--       All data is publicly accessible via the anon key.
-- ================================================================


-- ████████████████████████████████████████████████████████████████
-- SECTION 1: AGREEMENTS TABLE
-- ████████████████████████████████████████████████████████████████

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS public.agreements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  data        JSONB DEFAULT '{}',
  step        TEXT DEFAULT 'num_partners',
  is_done     BOOLEAN DEFAULT false,
  messages    JSONB DEFAULT '[]',
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);


-- ████████████████████████████████████████████████████████████████
-- SECTION 2: STORAGE — Private 'documents' Bucket
-- ████████████████████████████████████████████████████████████████
-- Files stored as: documents/{filename}
-- Bucket is PRIVATE — all access via signed URLs only.

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
  public = false,
  file_size_limit = 10485760;


-- ████████████████████████████████████████████████████████████████
-- SECTION 3: DATA RETENTION FUNCTION
-- ████████████████████████████████████████████████████████████████
-- Automatic cleanup: deletes inactive agreements (30 days).

CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  agreement_retention_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_agreements INT;
  result JSONB;
BEGIN
  -- Delete agreements inactive for N days
  DELETE FROM public.agreements
  WHERE updated_at < NOW() - (agreement_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_agreements = ROW_COUNT;

  -- Build result summary
  result := jsonb_build_object(
    'deleted_agreements', deleted_agreements,
    'agreement_retention_days', agreement_retention_days,
    'executed_at', NOW()
  );

  RETURN result;
END;
$$;

-- Function comment
COMMENT ON FUNCTION public.cleanup_expired_data IS
  'Data retention: deletes inactive agreements (default 30 days).';


-- ████████████████████████████████████████████████████████████████
-- SECTION 4: OPTIONAL — pg_cron for Automatic Daily Cleanup
-- (Uncomment if pg_cron extension is available)
-- ████████████████████████████████████████████████████████████████

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'daily-data-retention-cleanup',
--   '0 3 * * *',                        -- 3:00 AM UTC daily
--   $$SELECT public.cleanup_expired_data(30)$$
-- );


-- ================================================================
-- VERIFICATION QUERIES (run manually after applying)
-- ================================================================
--
-- 1. Check agreements table exists:
--    SELECT * FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name = 'agreements';
--
-- 2. Check storage bucket:
--    SELECT id, name, public, file_size_limit
--    FROM storage.buckets WHERE id = 'documents';
--
-- 3. Check cleanup function exists:
--    SELECT routine_name, routine_type
--    FROM information_schema.routines
--    WHERE routine_name = 'cleanup_expired_data';
-- ================================================================
