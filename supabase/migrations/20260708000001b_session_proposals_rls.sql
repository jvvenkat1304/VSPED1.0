-- =============================================================================
-- V-SPED: Session Proposals RLS Policies
-- Created: July 8, 2026
-- Purpose: Enables Row Level Security on session_proposals and creates
--   policies for parent and educator access. Parents can view and create their
--   own proposals; educators can view and update proposals addressed to them.
--   Uses idempotent pattern (DROP IF EXISTS before CREATE).
-- Requirements: 10.2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on session_proposals
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_proposals ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Parents can view their own proposals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS proposals_parent_select ON public.session_proposals;
CREATE POLICY proposals_parent_select ON public.session_proposals
  FOR SELECT USING (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Parents can create proposals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS proposals_parent_insert ON public.session_proposals;
CREATE POLICY proposals_parent_insert ON public.session_proposals
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Educators can view proposals addressed to them
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS proposals_educator_select ON public.session_proposals;
CREATE POLICY proposals_educator_select ON public.session_proposals
  FOR SELECT USING (educator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Educators can update proposals addressed to them (accept/reject/counter)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS proposals_educator_update ON public.session_proposals;
CREATE POLICY proposals_educator_update ON public.session_proposals
  FOR UPDATE USING (educator_id = auth.uid());
