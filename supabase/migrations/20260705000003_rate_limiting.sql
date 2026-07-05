-- =============================================================
-- V-SPED: Rate Limiting via PostgreSQL
-- Created: July 5, 2026
-- Purpose: Prevents abuse of OTP sending, consent requests, and
--   other sensitive operations. No external dependencies (Redis etc).
--   Uses a sliding-window approach with automatic cleanup.
-- =============================================================

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,        -- phone number, user_id, IP, etc.
  action TEXT NOT NULL,            -- 'send_otp', 'request_consent', 'verify_pin', etc.
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups: "how many times did X do Y in the last Z minutes?"
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON public.rate_limits(identifier, action, requested_at DESC);

-- Auto-cleanup: delete entries older than 1 hour (keeps table small)
-- This can be called periodically or before each check.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE requested_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core function: check if an action is rate-limited
-- Returns TRUE if the request is ALLOWED, FALSE if it should be blocked.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count requests in the window
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND requested_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- If under limit, record this request and allow
  IF request_count < p_max_requests THEN
    INSERT INTO public.rate_limits (identifier, action) VALUES (p_identifier, p_action);
    RETURN TRUE;
  END IF;

  -- Over limit — block
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: rate_limits table is internal-only (no user access via REST API)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no access via PostgREST. Only service_role (edge functions) can use it.

-- =============================================================
-- RATE LIMIT RULES (enforced by edge functions):
--
-- | Action          | Max Requests | Window   | Identifier |
-- |-----------------|-------------|----------|------------|
-- | send_otp        | 3           | 5 min    | phone      |
-- | verify_otp      | 5           | 5 min    | phone      |
-- | verify_pin      | 3           | 15 min   | user_id    | (already handled by lockout, this is extra)
-- | request_consent | 10          | 60 min   | user_id    |
-- | create_child    | 5           | 60 min   | user_id    |
-- =============================================================
