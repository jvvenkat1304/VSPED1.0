-- Ensure auth/PIN columns exist on public.users
-- Idempotent: safe to run multiple times.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pin_hash') THEN
    ALTER TABLE public.users ADD COLUMN pin_hash text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'failed_pin_attempts') THEN
    ALTER TABLE public.users ADD COLUMN failed_pin_attempts integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pin_locked_until') THEN
    ALTER TABLE public.users ADD COLUMN pin_locked_until timestamptz DEFAULT NULL;
  END IF;
END $$;
