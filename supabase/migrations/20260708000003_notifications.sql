-- =============================================================================
-- V-SPED: Notifications Table
-- Created: July 8, 2026
-- Purpose: In-app notification storage for session proposal lifecycle events.
--   Supports proposal_received, proposal_accepted/rejected/countered,
--   counter_accepted/withdrawn, proposal_expired, payment_completed,
--   and payment_reminder notification types.
-- Requirements: 8.1, 8.2, 8.3, 8.5
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create notifications table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN (
    'proposal_received',
    'proposal_accepted',
    'proposal_rejected',
    'proposal_countered',
    'counter_accepted',
    'counter_withdrawn',
    'proposal_expired',
    'payment_completed',
    'payment_reminder'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS notifications_own_select ON public.notifications;
CREATE POLICY notifications_own_select ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Inserts by service_role only (edge functions create notifications)
-- No INSERT policy for regular users

-- =============================================================================
-- NOTES:
-- - No INSERT policy exists for regular users. Only service_role (which bypasses
--   RLS) can insert notifications via edge functions.
-- - The partial index on unread notifications (WHERE read_at IS NULL) optimises
--   badge count queries and notification feed loads.
-- - The metadata JSONB column stores proposal_id, educator_id, parent_id etc.
--   for deep-linking from the notification feed to the relevant proposal.
-- =============================================================================
