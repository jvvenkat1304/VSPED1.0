-- =============================================================================
-- V-SPED: Educator Subscription System
-- Created: July 5, 2026
-- Purpose: Adds subscription tracking for educators and updates educator_profiles
--   for RCI verification status and subscription state.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure educator_profiles has the fields we need
-- The existing table has: id, bio, qualifications, specializations, 
-- experience_years, hourly_rate, photo_url, availability, is_verified, 
-- is_active, rating
-- We add: rci_number, rci_verified_at, subscription fields, subjects, 
-- languages, city, session_rate_inr, max_group_size
-- We reuse: is_verified (for RCI), is_active (keep as-is), bio (already exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- RCI verification fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='rci_number') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN rci_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='rci_verified_at') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN rci_verified_at TIMESTAMPTZ;
  END IF;

  -- Subscription fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subscription_status') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'trial', 'active', 'expired', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subscription_plan') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subscription_plan TEXT CHECK (subscription_plan IN ('basic', 'premium'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subscription_expires_at') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='razorpay_subscription_id') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN razorpay_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='razorpay_customer_id') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN razorpay_customer_id TEXT;
  END IF;

  -- Profile fields for marketplace listing (only add if missing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='subjects') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN subjects TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='languages') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN languages TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='city') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='session_rate_inr') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN session_rate_inr INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='educator_profiles' AND column_name='max_group_size') THEN
    ALTER TABLE public.educator_profiles ADD COLUMN max_group_size INTEGER DEFAULT 1 CHECK (max_group_size >= 1 AND max_group_size <= 8);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. SUBSCRIPTION_PLANS reference table (placeholder pricing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,  -- 'basic', 'premium'
  name TEXT NOT NULL,
  price_inr INTEGER NOT NULL,       -- annual price in INR (paise for Razorpay = this * 100)
  duration_days INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  razorpay_plan_id TEXT,            -- created in Razorpay dashboard, linked here
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert placeholder plans (idempotent)
INSERT INTO public.subscription_plans (id, name, price_inr, duration_days, features)
VALUES 
  ('basic', 'Basic (Annual)', 2999, 365, '{"max_group_size": 1, "video_sessions": true, "profile_listing": true, "assessments": false}'),
  ('premium', 'Premium (Annual)', 5999, 365, '{"max_group_size": 4, "video_sessions": true, "profile_listing": true, "assessments": true, "priority_listing": true}')
ON CONFLICT (id) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  features = EXCLUDED.features;

-- ---------------------------------------------------------------------------
-- 3. SUBSCRIPTION_PAYMENTS tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES public.users(id),
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount_inr INTEGER NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_educator ON public.subscription_payments(educator_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. RLS for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Plans are publicly readable (anyone can see pricing)
DROP POLICY IF EXISTS plans_public_read ON public.subscription_plans;
CREATE POLICY plans_public_read ON public.subscription_plans
  FOR SELECT USING (true);

-- Payments: educators see only their own
DROP POLICY IF EXISTS payments_educator_select ON public.subscription_payments;
CREATE POLICY payments_educator_select ON public.subscription_payments
  FOR SELECT USING (educator_id = auth.uid());

-- Service role handles inserts (from payment webhook edge function)

-- ---------------------------------------------------------------------------
-- 5. Update educator_profiles RLS — educators must have active subscription to be listed publicly
-- ---------------------------------------------------------------------------
-- Parents can browse ONLY verified + subscribed educators
DROP POLICY IF EXISTS educator_profiles_public_browse ON public.educator_profiles;
CREATE POLICY educator_profiles_public_browse ON public.educator_profiles
  FOR SELECT USING (
    is_verified = TRUE 
    AND subscription_status = 'active'
  );

-- Educators can always read/write their own profile
DROP POLICY IF EXISTS educator_profiles_own ON public.educator_profiles;
CREATE POLICY educator_profiles_own ON public.educator_profiles
  FOR ALL USING (id = auth.uid());

-- =============================================================================
-- NOTES:
-- - Razorpay plan IDs (razorpay_plan_id in subscription_plans) need to be
--   created in the Razorpay dashboard and linked here via UPDATE once available.
-- - Placeholder prices: Basic ₹2,999/yr, Premium ₹5,999/yr (adjustable).
-- - Educator must be both RCI-verified AND have active subscription to appear
--   in parent search results.
-- =============================================================================
