-- ============================================================
-- Migration 003: Audit Logging Table
-- Deed AI — Security Audit Section 9
--
-- Creates an append-only audit_logs table for tracking all
-- sensitive operations (DPDP Act compliance).
--
-- Key design decisions:
--   - Service role (server) can INSERT logs
--   - Users can SELECT only their own logs (transparency)
--   - Nobody can UPDATE or DELETE logs (tamper-proof)
--   - FORCE RLS ensures even superuser can't bypass policies
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Create the audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL,         -- e.g. 'chat', 'render_deed', 'download_docx', 'download_pdf', 'delete_agreement', 'rename_agreement'
  resource_id UUID,                  -- optional: the agreement id involved
  metadata    JSONB DEFAULT '{}',    -- optional: extra context (IP, user agent, etc.)
  ip_address  TEXT,                  -- client IP (for DPDP Act traceability)
  user_agent  TEXT                   -- browser/client identifier
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defense-in-depth)
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 3. RLS Policies (drop + create for idempotency)

-- Policy: Service role can INSERT audit logs
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
  CREATE POLICY "Service role can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);
END $$;

-- Policy: Authenticated users can read their own audit logs (transparency / DPDP right)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
  CREATE POLICY "Users can view own audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
END $$;

-- No UPDATE or DELETE policies — logs are immutable

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs (action);

-- 5. Comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for all sensitive operations. DPDP Act compliance.';
