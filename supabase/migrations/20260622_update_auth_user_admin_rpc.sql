BEGIN;

-- Function: update_auth_user_admin(user_id uuid, new_email text, new_password text, user_metadata json)
-- Purpose: Update auth user (email/password) and upsert profile in a single RPC.
-- SECURITY DEFINER so admin-like updates can be performed via RPC when installed with proper privileges.

CREATE OR REPLACE FUNCTION public.update_auth_user_admin(
  p_user_id uuid,
  p_new_email text DEFAULT NULL,
  p_new_password text DEFAULT NULL,
  p_user_metadata jsonb DEFAULT '{}'::jsonb,
  p_profile_full_name text DEFAULT NULL,
  p_profile_phone text DEFAULT NULL,
  p_profile_address text DEFAULT NULL,
  p_profile_city text DEFAULT NULL,
  p_profile_role user_role DEFAULT 'vendor'::user_role
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing_email text;
  updated_profile json;
BEGIN
  SELECT email INTO existing_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found', 'code', '404');
  END IF;

  -- If a new email is provided and different, ensure it is not used by another user
  IF p_new_email IS NOT NULL AND p_new_email <> existing_email THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_new_email AND id <> p_user_id) THEN
      RETURN json_build_object('error', 'Email already exists', 'code', '23505');
    END IF;
  END IF;

  -- Update auth.users fields
  IF p_new_email IS NOT NULL OR p_new_password IS NOT NULL OR p_user_metadata IS NOT NULL THEN
    UPDATE auth.users
    SET
      email = COALESCE(NULLIF(p_new_email, ''), email),
      encrypted_password = CASE WHEN p_new_password IS NOT NULL THEN crypt(p_new_password, gen_salt('bf')) ELSE encrypted_password END,
      raw_user_meta_data = COALESCE(p_user_metadata, raw_user_meta_data),
      updated_at = now(),
      email_confirmed_at = CASE WHEN p_new_email IS NOT NULL THEN now() ELSE email_confirmed_at END
    WHERE id = p_user_id;

    -- Update auth.identities provider_id if email changed
    IF p_new_email IS NOT NULL AND p_new_email <> existing_email THEN
      UPDATE auth.identities
      SET provider_id = p_new_email, identity_data = json_build_object('sub', p_user_id::text, 'email', p_new_email), updated_at = now()
      WHERE user_id = p_user_id AND provider = 'email';
    END IF;
  END IF;

  -- Upsert profile data
  IF p_profile_full_name IS NOT NULL OR p_profile_phone IS NOT NULL OR p_profile_address IS NOT NULL OR p_profile_city IS NOT NULL OR p_profile_role IS NOT NULL OR p_new_email IS NOT NULL THEN
    WITH upsert AS (
      INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, address, city, role)
      VALUES (
        p_user_id,
        COALESCE(NULLIF(p_new_email, ''), existing_email),
        p_profile_full_name,
        split_part(p_profile_full_name, ' ', 1),
        split_part(p_profile_full_name, ' ', 2),
        p_profile_phone,
        p_profile_address,
        p_profile_city,
        COALESCE(p_profile_role, 'vendor'::user_role)
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        address = COALESCE(EXCLUDED.address, public.profiles.address),
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        role = COALESCE(EXCLUDED.role, public.profiles.role)
      RETURNING row_to_json(public.profiles.*)
    )
    SELECT row_to_json(upsert.*) INTO updated_profile FROM upsert LIMIT 1;
  END IF;

  RETURN json_build_object('id', p_user_id, 'profile', COALESCE(updated_profile, (SELECT row_to_json(public.profiles.*) FROM public.profiles WHERE id = p_user_id LIMIT 1)));
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM, 'code', SQLSTATE);
END;
$$;

COMMIT;
