-- =============================================================================
-- V-SPED: Link consent_grants to session_proposals & relax expires_at constraint
-- Created: July 8, 2026
-- Purpose: Adds proposal_id FK to consent_grants so auto-consent records created
--          on proposal acceptance are linked back to the originating proposal.
--          Makes expires_at nullable — proposal-linked grants have NULL expires_at
--          until all sessions complete (at which point expires_at = last_completed + 7d).
--          Replaces the strict grant_not_expired_at_creation CHECK with a relaxed
--          grant_expires_valid CHECK that permits NULL expires_at.
-- Requirements: 6.4, 11.5
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add proposal_id column referencing session_proposals(id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_grants'
      AND column_name = 'proposal_id'
  ) THEN
    ALTER TABLE public.consent_grants
      ADD COLUMN proposal_id UUID REFERENCES public.session_proposals(id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Make expires_at nullable (was NOT NULL — proposal-linked grants start with
--    NULL expires_at until sessions complete)
-- ---------------------------------------------------------------------------
ALTER TABLE public.consent_grants
  ALTER COLUMN expires_at DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Drop old strict constraint and add relaxed one that permits NULL expires_at
-- ---------------------------------------------------------------------------
ALTER TABLE public.consent_grants
  DROP CONSTRAINT IF EXISTS grant_not_expired_at_creation;

ALTER TABLE public.consent_grants
  DROP CONSTRAINT IF EXISTS grant_expires_valid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grant_expires_valid'
  ) THEN
    ALTER TABLE public.consent_grants
      ADD CONSTRAINT grant_expires_valid CHECK (
        expires_at IS NULL OR expires_at > granted_at
      );
  END IF;
END $$;
