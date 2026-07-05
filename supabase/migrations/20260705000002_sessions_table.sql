-- =============================================================================
-- V-SPED: Sessions Table — Update existing table with consent + scheduling fields
-- Created: July 5, 2026
-- The sessions table already exists with: id, enrollment_id, special_educator_id,
--   start_time, end_time, videosdk_room_id, status
-- We add: child_id, parent_id, consent_grant_id, proposed_at, subject,
--   session_type, participant_count, educator_notes_encrypted, cancelled_by,
--   cancellation_reason, accepted_at, started_at, completed_at, updated_at
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='child_id') THEN
    ALTER TABLE public.sessions ADD COLUMN child_id UUID REFERENCES public.children(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='parent_id') THEN
    ALTER TABLE public.sessions ADD COLUMN parent_id UUID REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='consent_grant_id') THEN
    ALTER TABLE public.sessions ADD COLUMN consent_grant_id UUID REFERENCES public.consent_grants(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='proposed_at') THEN
    ALTER TABLE public.sessions ADD COLUMN proposed_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='subject') THEN
    ALTER TABLE public.sessions ADD COLUMN subject TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='session_type') THEN
    ALTER TABLE public.sessions ADD COLUMN session_type TEXT DEFAULT '1:1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='participant_count') THEN
    ALTER TABLE public.sessions ADD COLUMN participant_count INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='educator_notes_encrypted') THEN
    ALTER TABLE public.sessions ADD COLUMN educator_notes_encrypted TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='cancelled_by') THEN
    ALTER TABLE public.sessions ADD COLUMN cancelled_by UUID REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='cancellation_reason') THEN
    ALTER TABLE public.sessions ADD COLUMN cancellation_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='accepted_at') THEN
    ALTER TABLE public.sessions ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='started_at') THEN
    ALTER TABLE public.sessions ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='completed_at') THEN
    ALTER TABLE public.sessions ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='updated_at') THEN
    ALTER TABLE public.sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Indexes on new columns
CREATE INDEX IF NOT EXISTS idx_sessions_special_educator ON public.sessions(special_educator_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON public.sessions(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON public.sessions(child_id);

-- ---------------------------------------------------------------------------
-- RLS Policies (using actual column names: special_educator_id, parent_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Educators see sessions they're part of
DROP POLICY IF EXISTS sessions_educator_select ON public.sessions;
CREATE POLICY sessions_educator_select ON public.sessions
  FOR SELECT USING (special_educator_id = auth.uid());

-- Educators can propose sessions (INSERT)
DROP POLICY IF EXISTS sessions_educator_insert ON public.sessions;
CREATE POLICY sessions_educator_insert ON public.sessions
  FOR INSERT WITH CHECK (special_educator_id = auth.uid());

-- Educators can update their own sessions (start, complete, add notes)
DROP POLICY IF EXISTS sessions_educator_update ON public.sessions;
CREATE POLICY sessions_educator_update ON public.sessions
  FOR UPDATE USING (special_educator_id = auth.uid());

-- Parents see sessions involving their children
DROP POLICY IF EXISTS sessions_parent_select ON public.sessions;
CREATE POLICY sessions_parent_select ON public.sessions
  FOR SELECT USING (parent_id = auth.uid());

-- Parents can update session status (accept/reject/cancel)
DROP POLICY IF EXISTS sessions_parent_update ON public.sessions;
CREATE POLICY sessions_parent_update ON public.sessions
  FOR UPDATE USING (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Auto-update updated_at
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
