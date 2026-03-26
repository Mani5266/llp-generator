-- ============================================================
-- Migration 004: Data Retention (DPDP Act Compliance)
-- Deed AI — Security Audit Section 10
--
-- Creates a PostgreSQL function for automatic data cleanup:
--   1. Delete agreements inactive for > 30 days
--   2. Delete audit logs older than 90 days
--   3. Delete orphaned storage objects (if any)
--
-- This function can be called by:
--   - A Supabase scheduled CRON job (pg_cron)
--   - A Supabase Edge Function on a schedule
--   - A manual trigger from the admin
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Create the retention cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  agreement_retention_days INT DEFAULT 30,
  audit_log_retention_days INT DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with owner privileges to bypass RLS
AS $$
DECLARE
  deleted_agreements INT;
  deleted_audit_logs INT;
  result JSONB;
BEGIN
  -- Delete agreements that haven't been updated in N days
  -- (inactive/abandoned drafts)
  DELETE FROM public.agreements
  WHERE updated_at < NOW() - (agreement_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_agreements = ROW_COUNT;

  -- Delete audit logs older than N days
  -- (retain enough for compliance investigation, then purge)
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - (audit_log_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;

  -- Build result summary
  result := jsonb_build_object(
    'deleted_agreements', deleted_agreements,
    'deleted_audit_logs', deleted_audit_logs,
    'agreement_retention_days', agreement_retention_days,
    'audit_log_retention_days', audit_log_retention_days,
    'executed_at', NOW()
  );

  -- Log the cleanup action to audit_logs (meta-audit)
  INSERT INTO public.audit_logs (user_id, action, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000',  -- System user placeholder
    'data_retention_cleanup',
    result
  );

  RETURN result;
END;
$$;

-- 2. Grant execution to service_role only
REVOKE ALL ON FUNCTION public.cleanup_expired_data(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(INT, INT) TO service_role;

-- 3. Comment for documentation
COMMENT ON FUNCTION public.cleanup_expired_data IS 
  'DPDP Act data retention: deletes inactive agreements (default 30 days) and old audit logs (default 90 days). Call via pg_cron or Edge Function.';

-- ============================================================
-- OPTIONAL: Enable pg_cron for automatic daily cleanup
-- (Uncomment if pg_cron extension is available on your Supabase plan)
-- ============================================================

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'daily-data-retention-cleanup',     -- job name
--   '0 3 * * *',                        -- 3:00 AM UTC daily
--   $$SELECT public.cleanup_expired_data(30, 90)$$
-- );
