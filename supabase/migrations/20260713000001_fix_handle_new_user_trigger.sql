-- =============================================================================
-- V-SPED: Fix handle_new_user trigger
-- Created: July 13, 2026
-- Purpose: Ensures the handle_new_user trigger exists and fires on auth.users
--   INSERT, creating a corresponding public.users row. This trigger was
--   originally created in the SQL Editor but was not tracked in migrations,
--   causing it to potentially be missing after schema changes.
-- =============================================================================

-- Recreate the function (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, email, role)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
