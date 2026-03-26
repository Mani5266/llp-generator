-- ============================================================
-- Migration 001: RLS Policies for `agreements` table
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================
-- This migration is IDEMPOTENT: safe to run multiple times.
--
-- Your existing schema (from queries 1-3 you already ran):
--   - agreements table with: id, created_at, updated_at, data,
--     step, is_done, user_id, messages
--   - RLS enabled with 4 policies (read/insert/update/delete)
--   - Index on user_id
--
-- This migration STRENGTHENS the existing setup by:
--   1. Adding ON DELETE CASCADE to user_id FK (DPDP compliance)
--   2. Adding FORCE ROW LEVEL SECURITY
--   3. Adding WITH CHECK to UPDATE policy (prevents ownership transfer)
--   4. Making user_id NOT NULL (prevents orphan rows)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: Schema hardening
-- ────────────────────────────────────────────────────────────

-- 1a. Make user_id NOT NULL — every agreement must belong to a user.
--     If you have any rows with NULL user_id, fix them first:
--     DELETE FROM agreements WHERE user_id IS NULL;
ALTER TABLE agreements ALTER COLUMN user_id SET NOT NULL;

-- 1b. Add ON DELETE CASCADE so deleting a user auto-deletes their agreements.
--     Must drop and re-add the FK constraint to change its behavior.
--     Uses pg_constraint (reliable in Supabase, unlike information_schema for auth schema).
DO $$
DECLARE
  _conname text;
BEGIN
  -- Find ALL FK constraints on agreements.user_id (by any name)
  FOR _conname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.agreements'::regclass
      AND con.contype = 'f'        -- foreign key
      AND att.attname = 'user_id'
  LOOP
    EXECUTE 'ALTER TABLE agreements DROP CONSTRAINT ' || quote_ident(_conname);
    RAISE NOTICE 'Dropped FK constraint: %', _conname;
  END LOOP;
END $$;

-- Re-add with ON DELETE CASCADE
ALTER TABLE agreements
  ADD CONSTRAINT agreements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────
-- STEP 2: RLS hardening
-- ────────────────────────────────────────────────────────────

-- Ensure RLS is enabled (already done, but idempotent)
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- Force RLS for ALL roles including table owner and service role.
-- This prevents accidental data leaks if the service role key is
-- exposed. Comment this out ONLY if your service role explicitly
-- needs to bypass RLS (e.g., for audit logging or admin queries).
ALTER TABLE agreements FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- STEP 3: Drop and recreate policies (idempotent)
-- ────────────────────────────────────────────────────────────

-- Drop all known policy names (covers both old and new naming)
DROP POLICY IF EXISTS "Users can read own agreements"   ON agreements;
DROP POLICY IF EXISTS "Users can view own agreements"   ON agreements;
DROP POLICY IF EXISTS "Users can insert own agreements"  ON agreements;
DROP POLICY IF EXISTS "Users can update own agreements"  ON agreements;
DROP POLICY IF EXISTS "Users can delete own agreements"  ON agreements;

-- SELECT: Users can only read rows where user_id = their auth UID
CREATE POLICY "Users can view own agreements"
  ON agreements
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert rows with their own user_id.
-- Prevents inserting rows attributed to another user.
CREATE POLICY "Users can insert own agreements"
  ON agreements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own rows.
-- USING  = which existing rows are visible for update
-- WITH CHECK = what the row must look like AFTER the update
-- Together they prevent: (a) updating others' rows, and
-- (b) changing user_id to hijack ownership to another user.
CREATE POLICY "Users can update own agreements"
  ON agreements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete rows they own
CREATE POLICY "Users can delete own agreements"
  ON agreements
  FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run manually after applying)
-- ────────────────────────────────────────────────────────────
--
-- 1. Check RLS is enabled and forced:
--    SELECT tablename, rowsecurity, forcerowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public' AND tablename = 'agreements';
--    -- Expected: rowsecurity = true, forcerowsecurity = true
--
-- 2. Check all 4 policies exist:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies
--    WHERE tablename = 'agreements';
--    -- Expected: 4 rows (SELECT, INSERT, UPDATE, DELETE)
--
-- 3. Check user_id is NOT NULL with CASCADE:
--    SELECT column_name, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'agreements' AND column_name = 'user_id';
--    -- Expected: is_nullable = 'NO'
--
-- 4. Check FK has ON DELETE CASCADE:
--    SELECT rc.delete_rule
--    FROM information_schema.referential_constraints rc
--    JOIN information_schema.table_constraints tc
--      ON rc.constraint_name = tc.constraint_name
--    WHERE tc.table_name = 'agreements';
--    -- Expected: delete_rule = 'CASCADE'
-- ────────────────────────────────────────────────────────────
