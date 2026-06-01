-- ============================================================================
-- RoomMark: 003_auth_trigger.sql
-- Auto-creates a profiles row when a new user signs up via Supabase Auth
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: handle_new_user()
-- Fires on INSERT to auth.users. Creates a minimal profile row.
-- full_name defaults to '' — user fills it in during onboarding.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    '',                       -- filled in during onboarding
    coalesce(NEW.created_at, now()),
    coalesce(NEW.created_at, now())
  );
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: on_auth_user_created
-- Fires AFTER INSERT on auth.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
