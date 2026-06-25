CREATE OR REPLACE FUNCTION check_auth_user_email_exists(user_email text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = user_email
  );
END;
$$;


CREATE OR REPLACE FUNCTION check_auth_user_exists(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
  );
END;
$$;


CREATE OR REPLACE FUNCTION update_profile_admin(
  p_user_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  UPDATE profiles
  SET
    email = COALESCE(p_updates->>'email', email),
    full_name = COALESCE(p_updates->>'full_name', full_name),
    first_name = COALESCE(p_updates->>'first_name', first_name),
    last_name = COALESCE(p_updates->>'last_name', last_name),
    phone = COALESCE(p_updates->>'phone', phone),
    address = COALESCE(p_updates->>'address', address),
    city = COALESCE(p_updates->>'city', city),
    role = COALESCE((p_updates->>'role')::user_role, role)
  WHERE id = p_user_id
  RETURNING to_jsonb(profiles.*)
  INTO result;

  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION update_user_email_admin(
  user_auth_id uuid,
  new_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  UPDATE auth.users
  SET
    email = new_email,
    updated_at = now()
  WHERE id = user_auth_id;

  UPDATE profiles
  SET email = new_email
  WHERE id = user_auth_id;

  RETURN json_build_object(
    'success', true,
    'email', new_email
  );

END;
$$;


CREATE OR REPLACE FUNCTION update_user_password_admin(
  user_auth_id uuid,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  UPDATE auth.users
  SET
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = user_auth_id;

  RETURN json_build_object(
    'success', true
  );

END;
$$;


CREATE OR REPLACE FUNCTION delete_auth_user_simple(
  user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  DELETE FROM profiles
  WHERE id = user_id;

  DELETE FROM auth.users
  WHERE id = user_id;

  RETURN 'SUCCESS';

EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION delete_auth_user(
  user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role;
BEGIN

  SELECT role
  INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role <> 'admin' THEN
    RETURN 'ERROR: Admin privileges required';
  END IF;

  DELETE FROM profiles
  WHERE id = user_id;

  DELETE FROM auth.users
  WHERE id = user_id;

  RETURN 'SUCCESS: User deleted successfully';

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;




