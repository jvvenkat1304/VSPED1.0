-- ============================================================
-- V-SPED Database Full Reset
-- Wipes ALL user data to enable fresh testing from scratch.
-- Run in Supabase SQL Editor.
-- WARNING: This is irreversible. All users must re-register.
-- ============================================================

-- 1. Clear all session/booking data
DELETE FROM sessions;
DELETE FROM proposal_payments;
DELETE FROM session_proposals;

-- 2. Clear consent system
DELETE FROM consent_audit_log;
DELETE FROM consent_grants;
DELETE FROM consent_requests;

-- 3. Clear notifications
DELETE FROM notifications;

-- 4. Clear children (encrypted PII)
DELETE FROM children;

-- 5. Clear educator data
DELETE FROM subscription_payments;
DELETE FROM verification_audit_log;
DELETE FROM educator_profiles;

-- 6. Clear rate limits
DELETE FROM rate_limits;

-- 7. Clear public users
DELETE FROM users;

-- 8. Clear auth users (removes phone numbers, sessions, everything)
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Done. All data wiped. Everyone must sign up fresh.
-- The schema, RLS policies, functions, and triggers remain intact.
