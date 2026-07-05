-- =============================================================================
-- V-SPED: Sessions Table
-- Created: July 5, 2026
-- Purpose: Tracks scheduled sessions between educators and children.
--   Educator proposes → parent accepts/rejects → session happens → completed.
--   Requires active consent grant for the educator to access child data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  educator_id UUID NOT NULL REFERENCES public.users(id),
  child_id UUID NOT NULL REFERENCES public.children(id),
  parent_id UUID NOT NULL REFERENCES public.users(id),  -- denormalised for fast RLS
  
  -- Linked consent (educator must have active consent to conduct session)
  consent_grant_id UUID REFERENCES public.consent_grants(id),
  
  -- Scheduling
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  
  -- Status lifecycle: proposed → accepted → in_progress → completed | cancelled | no_show
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'accepted', 'rejected', 'cancelled', 
    'in_progress', 'completed', 'no_show'
  )),
  
  -- Session details
  subject TEXT,               -- what the session covers
  session_type TEXT DEFAULT '1:1' CHECK (session_type IN ('1:1', 'group')),
  participant_count INTEGER DEFAULT 1 CHECK (participant_count >= 1 AND participant_count <= 8),
  
  -- Notes (encrypted — child data privacy rule applies)
  educator_notes_encrypted TEXT,   -- only accessible with active consent
  
  -- Cancellation/rejection
  cancelled_by UUID REFERENCES public.users(id),
  cancellation_reason TEXT,
  
  -- Timestamps
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT session_end_after_start CHECK (scheduled_end > scheduled_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_educator ON public.sessions(educator_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON public.sessions(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON public.sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.sessions(scheduled_start) WHERE status IN ('accepted', 'in_progress');

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Educators see sessions they're part of
DROP POLICY IF EXISTS sessions_educator_select ON public.sessions;
CREATE POLICY sessions_educator_select ON public.sessions
  FOR SELECT USING (educator_id = auth.uid());

-- Educators can propose sessions (INSERT)
DROP POLICY IF EXISTS sessions_educator_insert ON public.sessions;
CREATE POLICY sessions_educator_insert ON public.sessions
  FOR INSERT WITH CHECK (educator_id = auth.uid());

-- Educators can update their own sessions (start, complete, add notes)
DROP POLICY IF EXISTS sessions_educator_update ON public.sessions;
CREATE POLICY sessions_educator_update ON public.sessions
  FOR UPDATE USING (educator_id = auth.uid());

-- Parents see sessions involving their children
DROP POLICY IF EXISTS sessions_parent_select ON public.sessions;
CREATE POLICY sessions_parent_select ON public.sessions
  FOR SELECT USING (parent_id = auth.uid());

-- Parents can update session status (accept/reject/cancel)
DROP POLICY IF EXISTS sessions_parent_update ON public.sessions;
CREATE POLICY sessions_parent_update ON public.sessions
  FOR UPDATE USING (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Auto-update updated_at on any change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sessions_timestamp();
