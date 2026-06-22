BEGIN;

-- Remove old overload that used `json` for p_user_metadata to avoid ambiguity
DROP FUNCTION IF EXISTS public.update_auth_user_admin(
  uuid,
  text,
  text,
  json,
  text,
  text,
  text,
  text,
  public.user_role
);

COMMIT;
