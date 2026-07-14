-- =============================================================================
-- V-SPED: Proposal Payments Table
-- Created: July 8, 2026
-- Purpose: Creates the proposal_payments table to track payment records linked
--   to accepted session proposals. Stores amount breakdown (subtotal, GST, total),
--   payment lifecycle status, and Razorpay references (stubbed for MVP).
--   Inserts and updates are performed by service_role (edge functions) only.
-- Requirements: 7.1, 7.2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create proposal_payments table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.session_proposals(id),
  parent_id UUID NOT NULL REFERENCES public.users(id),
  educator_id UUID NOT NULL REFERENCES public.users(id),

  -- Amount breakdown
  sessions_count INTEGER NOT NULL,
  rate_per_session INTEGER NOT NULL,
  subtotal_inr INTEGER NOT NULL,       -- sessions_count × rate_per_session
  gst_inr INTEGER NOT NULL,            -- subtotal × 0.18 (rounded)
  total_inr INTEGER NOT NULL,          -- subtotal + gst

  -- Payment state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proposal_payments_proposal
  ON public.proposal_payments(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_payments_parent
  ON public.proposal_payments(parent_id, status);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.proposal_payments ENABLE ROW LEVEL SECURITY;

-- Parents can view their own payment records
DROP POLICY IF EXISTS payments_parent_select ON public.proposal_payments;
CREATE POLICY payments_parent_select ON public.proposal_payments
  FOR SELECT USING (parent_id = auth.uid());

-- Educators can view payment records for their proposals
DROP POLICY IF EXISTS payments_educator_select ON public.proposal_payments;
CREATE POLICY payments_educator_select ON public.proposal_payments
  FOR SELECT USING (educator_id = auth.uid());

-- Inserts and updates handled by service_role (edge functions)
