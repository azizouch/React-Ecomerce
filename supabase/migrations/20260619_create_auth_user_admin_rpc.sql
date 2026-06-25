BEGIN;

-- Function: create_auth_user_admin(email text, password text, metadata json)
-- Purpose: Create a new auth user by inserting directly into auth.users and auth.identities
-- Note: This works only on self-hosted or environments that allow SQL-level auth management.

CREATE OR REPLACE FUNCTION public.create_auth_user_admin(
  user_email text,
  user_password text,
  user_metadata json DEFAULT '{}'::json,
  profile_full_name text DEFAULT NULL,
  profile_phone text DEFAULT NULL,
  profile_address text DEFAULT NULL,
  profile_city text DEFAULT NULL,
  profile_role user_role DEFAULT 'vendor'::user_role
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id uuid;
  result json;
  instance_uuid uuid;
  profile_data json;
BEGIN
  -- Get the instance ID from existing users
  SELECT COALESCE(
    (SELECT DISTINCT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO instance_uuid;
  
  -- Ensure this email is not already registered in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object(
      'error', 'Email already exists',
      'code', '23505'
    );
  END IF;

  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users with minimal required fields
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_user_id,
    instance_uuid,
    lower(user_email),
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    COALESCE(user_metadata, '{}'::json),
    '{}'::json,
    false,
    'authenticated',
    'authenticated'
  );
  
  -- Insert into auth.identities (required for login)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    'email',
    lower(user_email),
    json_build_object('sub', new_user_id::text, 'email', lower(user_email)),
    now(),
    now(),
    now()
  );
  
  -- Insert into profiles using the same generated auth user id
  INSERT INTO public.profiles AS p (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    address,
    city,
    role
  ) VALUES (
    new_user_id,
    user_email,
    profile_full_name,
    split_part(profile_full_name, ' ', 1),
    split_part(profile_full_name, ' ', 2),
    profile_phone,
    profile_address,
    profile_city,
    profile_role
  ) RETURNING row_to_json(p.*) INTO profile_data;
  
  -- Return the created user info with profile details
  result := json_build_object(
    'id', new_user_id,
    'email', user_email,
    'created_at', now(),
    'profile', profile_data
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

COMMIT;
