-- =============================================================================
-- V-SPED: Razorpay Integration Columns
-- Created: July 13, 2026
-- Purpose: Adds Razorpay reference columns to educator_profiles,
--   subscription_plans, subscription_payments, and proposal_payments tables.
-- =============================================================================

-- 1. subscription_plans: store Razorpay plan IDs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='razorpay_plan_id') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN razorpay_plan_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='active') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN active BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='duration_days') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN duration_days INTEGER DEFAULT 365;
  END IF;
END $$;

-- 2. educator_profiles: store subscription references
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='razorpay_subscription_id') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN razorpay_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subscription_expires_at') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subscription_plan') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subscription_plan TEXT;
  END IF;
END $$;

-- 3. subscription_payments: Razorpay references
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_payments' AND column_name='razorpay_subscription_id') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN razorpay_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_payments' AND column_name='razorpay_payment_id') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN razorpay_payment_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_payments' AND column_name='paid_at') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. proposal_payments: Razorpay payment link references
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='proposal_payments' AND column_name='razorpay_payment_link_id') THEN
    ALTER TABLE public.proposal_payments ADD COLUMN razorpay_payment_link_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='proposal_payments' AND column_name='razorpay_payment_link_url') THEN
    ALTER TABLE public.proposal_payments ADD COLUMN razorpay_payment_link_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='proposal_payments' AND column_name='paid_at') THEN
    ALTER TABLE public.proposal_payments ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;
