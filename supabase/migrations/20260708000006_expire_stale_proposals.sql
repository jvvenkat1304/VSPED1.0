-- =============================================================================
-- V-SPED: Expire Stale Proposals Function
-- Created: July 8, 2026
-- Purpose: Automatically transitions proposals with status 'pending' or
--   'countered' to 'expired' when their expires_at timestamp has passed.
--   Also creates in-app notifications for both parent and educator.
--
-- Invocation: This function is designed to be called every 5 minutes via
--   pg_cron (e.g., SELECT cron.schedule('expire-proposals', '*/5 * * * *',
--   'SELECT public.expire_stale_proposals()')) or a scheduled Supabase Edge
--   Function. The 5-minute notification window (expires_at > NOW() - INTERVAL
--   '5 minutes') prevents duplicate notifications across consecutive runs.
--
-- Requirements: 9.1, 9.2, 9.3, 9.4
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_stale_proposals()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Transition pending/countered proposals past their expiry time
  UPDATE public.session_proposals
  SET status = 'expired'
  WHERE status IN ('pending', 'countered')
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Create notifications for newly expired proposals (parent side)
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT 
    parent_id, 'proposal_expired', 
    'Proposal Expired', 
    'Your session proposal has expired without a response.',
    jsonb_build_object('proposal_id', id)
  FROM public.session_proposals
  WHERE status = 'expired' 
    AND expires_at <= NOW() 
    AND expires_at > NOW() - INTERVAL '5 minutes';

  -- Create notifications for newly expired proposals (educator side)
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT 
    educator_id, 'proposal_expired',
    'Proposal Expired',
    'A session proposal has expired.',
    jsonb_build_object('proposal_id', id)
  FROM public.session_proposals
  WHERE status = 'expired' 
    AND expires_at <= NOW()
    AND expires_at > NOW() - INTERVAL '5 minutes';

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
