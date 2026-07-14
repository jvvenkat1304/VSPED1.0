-- =============================================================================
-- V-SPED: Session Proposals Table
-- Created: July 8, 2026
-- Purpose: Creates the session_proposals table for the parent-initiated
--   proposal and booking flow. Tracks the full proposal lifecycle including
--   original terms, counter-proposal fields, linked records, and timestamps.
--   Indexes support efficient lookups by educator, parent, and expiry queries.
-- Requirements: 10.1, 10.3
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create session_proposals table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.users(id),
  child_id UUID NOT NULL REFERENCES public.children(id),
  educator_id UUID NOT NULL REFERENCES public.users(id),

  -- Original proposal terms
  sessions_per_week INTEGER NOT NULL CHECK (sessions_per_week BETWEEN 1 AND 7),
  total_sessions INTEGER NOT NULL CHECK (total_sessions >= 1),
  proposed_rate_inr INTEGER NOT NULL CHECK (proposed_rate_inr >= 1),
  notes TEXT CHECK (char_length(notes) <= 500),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'countered',
    'parent_accepted', 'withdrawn', 'expired', 'paid'
  )),

  -- Counter-proposal fields (populated by educator)
  counter_rate_inr INTEGER CHECK (counter_rate_inr >= 1),
  counter_sessions_per_week INTEGER CHECK (counter_sessions_per_week BETWEEN 1 AND 7),
  counter_total_sessions INTEGER CHECK (counter_total_sessions >= 1),
  counter_notes TEXT CHECK (char_length(counter_notes) <= 500),

  -- Linked records (FKs added later or handled at application level)
  consent_grant_id UUID,
  payment_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),

  -- Constraints
  CONSTRAINT valid_counter_fields CHECK (
    (status != 'countered') OR
    (counter_rate_inr IS NOT NULL AND counter_sessions_per_week IS NOT NULL AND counter_total_sessions IS NOT NULL)
  )
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proposals_educator_status
  ON public.session_proposals(educator_id, status);

CREATE INDEX IF NOT EXISTS idx_proposals_parent_status
  ON public.session_proposals(parent_id, status);

CREATE INDEX IF NOT EXISTS idx_proposals_expiry
  ON public.session_proposals(status, expires_at)
  WHERE status IN ('pending', 'countered');
