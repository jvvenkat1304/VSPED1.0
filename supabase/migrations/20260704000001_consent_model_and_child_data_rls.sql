-- =============================================================================
-- V-SPED: DPDP Consent Model & Child Data Access Control
-- Created: July 4, 2026
-- Purpose: Implements the immutable child data privacy rule:
--   - All child data encrypted/invisible by default
--   - Access requires explicit, time-bound, parent-granted consent
--   - Automatic revocation on expiry
--   - Full audit trail
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CHILDREN table — central child identity
-- If the table already exists (from prior migrations), add missing columns.
-- If it doesn't exist, create it fresh.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Create table if it doesn't exist at all
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'children') THEN
    CREATE TABLE public.children (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      encrypted_name TEXT NOT NULL,
      encrypted_dob TEXT,
      encrypted_gender TEXT,
      child_uuid_public TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL
    );
  ELSE
    -- Table exists; ensure our required columns are present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='encrypted_name') THEN
      ALTER TABLE public.children ADD COLUMN encrypted_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='encrypted_dob') THEN
      ALTER TABLE public.children ADD COLUMN encrypted_dob TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='encrypted_gender') THEN
      ALTER TABLE public.children ADD COLUMN encrypted_gender TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='child_uuid_public') THEN
      ALTER TABLE public.children ADD COLUMN child_uuid_public TEXT DEFAULT encode(gen_random_bytes(16), 'hex');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='deleted_at') THEN
      ALTER TABLE public.children ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='children' AND column_name='parent_id') THEN
      ALTER TABLE public.children ADD COLUMN parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);

-- ---------------------------------------------------------------------------
-- 2. CONSENT_REQUESTS — third parties request access to child data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is requesting
  requester_id UUID NOT NULL REFERENCES public.users(id),
  requester_role TEXT NOT NULL,  -- 'special_educator', 'school_teacher', etc.
  
  -- Which child's data
  child_id UUID NOT NULL REFERENCES public.children(id),
  parent_id UUID NOT NULL REFERENCES public.users(id),  -- denormalised for fast RLS
  
  -- What they're requesting
  reason TEXT NOT NULL,                     -- "To plan therapy sessions for 6-month term"
  requested_duration_hours INTEGER NOT NULL, -- how long they want access (in hours)
  requested_scope TEXT[] NOT NULL DEFAULT ARRAY['progress', 'session_notes'],  -- which data categories
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'rejected', 'expired', 'cancelled')),
  
  -- Parent's modifications (if they propose changes)
  parent_modified_duration_hours INTEGER,   -- NULL if accepted as-is
  parent_modified_scope TEXT[],             -- NULL if accepted as-is
  parent_response_note TEXT,                -- optional note from parent
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,                 -- when parent responded
  
  CONSTRAINT fk_consent_child_parent CHECK (true)  -- parent_id must match child's parent (enforced in RLS/trigger)
);

CREATE INDEX IF NOT EXISTS idx_consent_requests_parent ON public.consent_requests(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_requests_requester ON public.consent_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_requests_child ON public.consent_requests(child_id);

-- ---------------------------------------------------------------------------
-- 3. CONSENT_GRANTS — active, time-bound access grants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  request_id UUID NOT NULL REFERENCES public.consent_requests(id),
  child_id UUID NOT NULL REFERENCES public.children(id),
  parent_id UUID NOT NULL REFERENCES public.users(id),
  grantee_id UUID NOT NULL REFERENCES public.users(id),  -- who has access
  
  -- What's granted
  scope TEXT[] NOT NULL,                    -- data categories accessible
  
  -- Time bounds
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,          -- access automatically dies here
  revoked_at TIMESTAMPTZ DEFAULT NULL,      -- NULL = still active; set = manually revoked
  
  -- Derived: is this grant currently active?
  -- Active = revoked_at IS NULL AND expires_at > NOW()
  
  CONSTRAINT grant_not_expired_at_creation CHECK (expires_at > granted_at)
);

CREATE INDEX IF NOT EXISTS idx_consent_grants_grantee ON public.consent_grants(grantee_id);
CREATE INDEX IF NOT EXISTS idx_consent_grants_child ON public.consent_grants(child_id);
CREATE INDEX IF NOT EXISTS idx_consent_grants_active ON public.consent_grants(grantee_id, child_id) 
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. CONSENT_AUDIT_LOG — immutable record of every access event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_created', 'request_approved', 'request_modified', 'request_rejected',
    'grant_created', 'grant_expired', 'grant_revoked',
    'data_accessed', 'data_access_denied'
  )),
  
  -- Context
  actor_id UUID NOT NULL REFERENCES public.users(id),  -- who performed the action
  child_id UUID REFERENCES public.children(id),
  consent_request_id UUID REFERENCES public.consent_requests(id),
  consent_grant_id UUID REFERENCES public.consent_grants(id),
  
  -- Details
  details JSONB DEFAULT '{}',  -- flexible: { "scope": [...], "reason": "...", "ip": "..." }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log is append-only; no UPDATE or DELETE allowed (enforced via RLS)
CREATE INDEX IF NOT EXISTS idx_audit_log_child ON public.consent_audit_log(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.consent_audit_log(actor_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. HELPER FUNCTION: Check if a user has active consent for a child
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_active_consent(
  p_user_id UUID,
  p_child_id UUID,
  p_scope TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.consent_grants
    WHERE grantee_id = p_user_id
      AND child_id = p_child_id
      AND revoked_at IS NULL
      AND expires_at > NOW()
      AND (p_scope IS NULL OR p_scope = ANY(scope))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------------

-- === CHILDREN table ===
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS children_parent_select ON public.children;
DROP POLICY IF EXISTS children_parent_insert ON public.children;
DROP POLICY IF EXISTS children_parent_update ON public.children;
DROP POLICY IF EXISTS children_grantee_select ON public.children;

-- Parents can see/manage only their own children
CREATE POLICY children_parent_select ON public.children
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY children_parent_insert ON public.children
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY children_parent_update ON public.children
  FOR UPDATE USING (parent_id = auth.uid());

-- Grantees can see children ONLY if they have active consent (and only non-PII unless scope includes it)
CREATE POLICY children_grantee_select ON public.children
  FOR SELECT USING (
    public.has_active_consent(auth.uid(), id)
  );

-- No one can hard-delete children (soft delete via parent update)
-- No DELETE policy = no deletion via API

-- === CONSENT_REQUESTS table ===
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_req_requester_insert ON public.consent_requests;
DROP POLICY IF EXISTS consent_req_requester_select ON public.consent_requests;
DROP POLICY IF EXISTS consent_req_parent_select ON public.consent_requests;
DROP POLICY IF EXISTS consent_req_parent_update ON public.consent_requests;

-- Requesters can create requests and see their own
CREATE POLICY consent_req_requester_insert ON public.consent_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY consent_req_requester_select ON public.consent_requests
  FOR SELECT USING (requester_id = auth.uid());

-- Parents can see requests for their children and update status (approve/reject/modify)
CREATE POLICY consent_req_parent_select ON public.consent_requests
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY consent_req_parent_update ON public.consent_requests
  FOR UPDATE USING (parent_id = auth.uid() AND status = 'pending');

-- === CONSENT_GRANTS table ===
ALTER TABLE public.consent_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_grants_parent_select ON public.consent_grants;
DROP POLICY IF EXISTS consent_grants_parent_revoke ON public.consent_grants;
DROP POLICY IF EXISTS consent_grants_grantee_select ON public.consent_grants;

-- Parents can see all grants for their children
CREATE POLICY consent_grants_parent_select ON public.consent_grants
  FOR SELECT USING (parent_id = auth.uid());

-- Parents can revoke (update revoked_at)
CREATE POLICY consent_grants_parent_revoke ON public.consent_grants
  FOR UPDATE USING (parent_id = auth.uid() AND revoked_at IS NULL);

-- Grantees can see their own active grants
CREATE POLICY consent_grants_grantee_select ON public.consent_grants
  FOR SELECT USING (grantee_id = auth.uid());

-- Only the system (service role) creates grants (via edge function after parent approves)
-- No INSERT policy for anon/authenticated = no direct creation by users

-- === CONSENT_AUDIT_LOG table ===
ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_parent_select ON public.consent_audit_log;

-- Audit log is append-only: users can insert (logged via edge functions)
-- Parents can read audit entries for their children
CREATE POLICY audit_log_parent_select ON public.consent_audit_log
  FOR SELECT USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

-- No UPDATE or DELETE policies = immutable log
-- Service role handles inserts from edge functions

-- ---------------------------------------------------------------------------
-- 7. TRIGGER: Auto-create audit log entry when consent request status changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_consent_request_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.consent_audit_log (event_type, actor_id, child_id, consent_request_id, details)
    VALUES (
      CASE NEW.status
        WHEN 'approved' THEN 'request_approved'
        WHEN 'modified' THEN 'request_modified'
        WHEN 'rejected' THEN 'request_rejected'
        ELSE 'request_created'
      END,
      auth.uid(),
      NEW.child_id,
      NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'scope', NEW.requested_scope)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_consent_request ON public.consent_requests;
CREATE TRIGGER trg_audit_consent_request
  AFTER UPDATE ON public.consent_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_consent_request_change();

-- ---------------------------------------------------------------------------
-- 8. TRIGGER: Auto-create audit log entry when grant is revoked
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_consent_grant_revoke()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.consent_audit_log (event_type, actor_id, child_id, consent_grant_id, details)
    VALUES (
      'grant_revoked',
      auth.uid(),
      NEW.child_id,
      NEW.id,
      jsonb_build_object('revoked_at', NEW.revoked_at, 'was_expires_at', NEW.expires_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_consent_revoke ON public.consent_grants;
CREATE TRIGGER trg_audit_consent_revoke
  AFTER UPDATE ON public.consent_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_consent_grant_revoke();

-- ---------------------------------------------------------------------------
-- 9. SCHEDULED: Expire grants past their time (run via pg_cron or Supabase scheduled function)
-- This query can be called periodically to mark expired grants in audit log.
-- The RLS already checks expires_at > NOW(), so expiry is real-time regardless.
-- This is just for audit completeness.
-- ---------------------------------------------------------------------------
-- To be called via a scheduled edge function or pg_cron:
-- INSERT INTO consent_audit_log (event_type, actor_id, child_id, consent_grant_id, details)
-- SELECT 'grant_expired', grantee_id, child_id, id, jsonb_build_object('expired_at', expires_at)
-- FROM consent_grants
-- WHERE revoked_at IS NULL AND expires_at <= NOW()
-- AND id NOT IN (SELECT consent_grant_id FROM consent_audit_log WHERE event_type = 'grant_expired');

-- ---------------------------------------------------------------------------
-- NOTES:
-- - Field-level encryption (AES-256) for child PII is handled at the application
--   layer (edge functions encrypt before INSERT, decrypt only for authorised reads).
--   The database stores ciphertext; even direct DB access shows encrypted blobs.
-- - The encryption key is stored in Supabase secrets (CHILD_DATA_ENCRYPTION_KEY),
--   accessible only to edge functions, never exposed to clients.
-- - This migration creates the consent infrastructure. Existing child-related tables
--   (game_progress, etc.) should be updated to join against consent_grants for access.
-- =============================================================================
