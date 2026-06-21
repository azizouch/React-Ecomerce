BEGIN;

-- Function: create_auth_user_admin(email text, password text, metadata json)
-- Purpose: Create a new auth user using the service_role and return the new user's id
-- Behavior: Uses Postgres "auth" schema helper via inserting into auth.users is not permitted
-- Instead this RPC uses Supabase provided function "auth.admin_create_user" style via plpgsql and pg_net or uses "auth.users" management via service_role.

-- Note: Supabase recommends creating auth users via the Admin API. This RPC attempts to call the internal function if available, otherwise falls back to using the
-- "auth" schema helper available in self-hosted setups. If your managed Supabase doesn't allow direct auth user creation from SQL, rely on the server-side admin client.

CREATE OR REPLACE FUNCTION public.create_auth_user_admin(
  user_email text,
  user_password text,
  user_metadata json DEFAULT '{}'::json
)
RETURNS TABLE(id uuid) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  created RECORD;
  u_id uuid;
BEGIN
  -- Try to use the "auth" extension's helper if present (self-hosted or enterprise)
  BEGIN
    PERFORM 1 FROM pg_proc WHERE proname = 'auth_create_user';
    IF FOUND THEN
      -- Hypothetical helper: auth_create_user(email, password, metadata json) RETURNS uuid
      SELECT auth_create_user(user_email, user_password, user_metadata) INTO u_id;
      RETURN QUERY SELECT u_id::uuid;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- ignore and fallback
  END;

  -- Fallback: if running on Supabase managed (no SQL-level creation), raise so client falls back to admin client
  RAISE EXCEPTION 'create_auth_user_admin: SQL-level auth user creation not available in this environment';
END;
$$;

COMMIT;
