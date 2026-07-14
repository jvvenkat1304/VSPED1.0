-- =============================================================================
-- V-SPED: RCI Verification System
-- Created: July 6, 2026
-- Purpose: Adds multi-stage verification status, self-attestation tracking,
--   audit log table, and updated RLS for marketplace visibility.
-- Requirements: 9.1, 9.2, 9.7, 5.2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add verification columns to educator_profiles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- verification_status: multi-stage lifecycle state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='verification_status') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (verification_status IN ('pending', 'provisionally_verified', 'verified', 'rejected'));
  END IF;

  -- self_attestation_at: timestamp when educator accepted the legal declaration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='self_attestation_at') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN self_attestation_at TIMESTAMPTZ;
  END IF;

  -- attestation_text: the exact legal text the educator accepted
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='attestation_text') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN attestation_text TEXT;
  END IF;

  -- rejection_reason: why an admin rejected this educator
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='rejection_reason') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN rejection_reason TEXT;
  END IF;

  -- verified_by: UUID of the admin who performed manual verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='verified_by') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN verified_by UUID REFERENCES auth.users(id);
  END IF;

  -- audit_notes: free-text admin notes about verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='audit_notes') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN audit_notes TEXT;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Create verification_audit_log table (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES public.educator_profiles(id),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('educator', 'admin', 'system')),
  reason TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for efficient lookups by educator
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_educator
  ON public.verification_audit_log(educator_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS on verification_audit_log: service_role only, append-only
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for regular users.
-- Only service_role (which bypasses RLS) can read/write this table.
-- This makes it effectively append-only from the application layer:
-- edge functions use service_role to INSERT, no UPDATE/DELETE policies exist.

-- ---------------------------------------------------------------------------
-- 4. Update educator_profiles_public_browse RLS policy
-- Now checks verification_status instead of only is_verified
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS educator_profiles_public_browse ON public.educator_profiles;
CREATE POLICY educator_profiles_public_browse ON public.educator_profiles
  FOR SELECT USING (
    verification_status IN ('provisionally_verified', 'verified')
    AND subscription_status = 'active'
  );

-- ---------------------------------------------------------------------------
-- 5. Backfill existing rows based on current is_verified column
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Educators already verified keep their verified status
  UPDATE public.educator_profiles
    SET verification_status = 'verified'
    WHERE is_verified = TRUE
      AND verification_status = 'pending';

  -- All others remain 'pending' (the DEFAULT), no action needed
END $$;

-- =============================================================================
-- NOTES:
-- - The verification_audit_log has no user-facing RLS policies. Only
--   service_role (edge functions) can INSERT. No UPDATE/DELETE policies ensures
--   the table is append-only.
-- - The educator_profiles_public_browse policy now gates marketplace visibility
--   on verification_status + subscription_status (Requirement 9.7).
-- - Backfill sets existing verified educators to 'verified' so they remain
--   visible in the marketplace without re-verification.
-- - The is_verified column is kept for backward compatibility; edge functions
--   will maintain both columns in sync going forward (Requirement 9.3).
-- =============================================================================
