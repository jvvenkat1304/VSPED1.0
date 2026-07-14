-- =============================================================================
-- V-SPED: Educator Minimum Rate Column and Public View
-- Created: July 8, 2026
-- Purpose: Adds min_rate_inr column to educator_profiles for the private floor
--   price used in proposal rate validation. Creates a public view that excludes
--   min_rate_inr so parents never see the educator's minimum acceptable rate.
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.4, 10.5
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add min_rate_inr column to educator_profiles (idempotent)
--    The column is nullable: existing educators who haven't set it yet will
--    have NULL. Edge functions default to session_rate_inr when NULL.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='min_rate_inr') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN min_rate_inr INTEGER;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Add CHECK constraints (idempotent)
--    - chk_min_rate_positive: min_rate_inr must be > 0 when set
--    - chk_min_rate_within_range: min_rate_inr must be >= session_rate_inr - 100
--    Both allow NULL (for educators who haven't configured min_rate yet).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_min_rate_positive') THEN
    ALTER TABLE public.educator_profiles ADD CONSTRAINT chk_min_rate_positive CHECK (min_rate_inr IS NULL OR min_rate_inr > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_min_rate_within_range') THEN
    ALTER TABLE public.educator_profiles ADD CONSTRAINT chk_min_rate_within_range CHECK (min_rate_inr IS NULL OR min_rate_inr >= session_rate_inr - 100);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Create a view for parent-facing queries (excludes min_rate_inr)
--    Parents use this view to browse eligible educators. The min_rate_inr
--    column is intentionally excluded so parents never see the floor price.
--    Only educators with active verification and subscription are shown.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.educator_profiles_public AS
  SELECT id, bio, subjects, languages, city, session_rate_inr,
         max_group_size, is_verified, verification_status, subscription_status
  FROM public.educator_profiles
  WHERE verification_status IN ('provisionally_verified', 'verified')
    AND subscription_status = 'active';

-- =============================================================================
-- NOTES:
-- - min_rate_inr is nullable: existing educators will have NULL until they set
--   it. The create-proposal edge function defaults to session_rate_inr when
--   min_rate_inr is NULL for validation purposes.
-- - The CHECK constraints allow NULL to preserve backward compatibility with
--   existing educator profiles that predate the proposal system.
-- - The educator_profiles_public view enforces column-level privacy for
--   min_rate_inr. RLS alone cannot hide individual columns, so this view is
--   used by parent-facing queries. Edge functions use service_role to access
--   the full table (including min_rate_inr) for validation.
-- - The view's WHERE clause mirrors the educator_profiles_public_browse RLS
--   policy logic (verification_status + subscription_status checks).
-- =============================================================================
