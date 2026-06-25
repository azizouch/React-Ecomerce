check_auth_user_email_exists => 
    DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = user_email)
  INTO user_exists;

  RETURN user_exists;
END;

check_auth_user_exists =>
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users 
  WHERE id = user_id;
  
  RETURN user_count > 0;
END;

create_auth_user_admin =>
    DECLARE
  new_user_id uuid;
  result json;
  instance_uuid uuid;
BEGIN
  -- Get the instance ID from existing users
  SELECT COALESCE(
    (SELECT DISTINCT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO instance_uuid;
  
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
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_user_id,
    instance_uuid,
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    user_metadata,
    false,
    'authenticated',
    'authenticated'
  );
  
  -- Insert into auth.identities (required for login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    json_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    now(),
    now(),
    now()
  );
  
  -- Return the created user info
  result := json_build_object(
    'id', new_user_id,
    'email', user_email,
    'created_at', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;

delete_auth_user =>
    DECLARE
  deleted_count INTEGER;
  current_user_role TEXT;
  auth_user_exists BOOLEAN;
BEGIN
  -- Check if auth user exists first
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO auth_user_exists;
  
  IF NOT auth_user_exists THEN
    RETURN 'WARNING: No auth user found with ID ' || user_id::text;
  END IF;

  -- Get current user's role
  SELECT role INTO current_user_role
  FROM utilisateurs 
  WHERE auth_id = auth.uid();
  
  -- Check if current user is admin
  IF current_user_role != 'Admin' THEN
    RETURN 'ERROR: Admin privileges required. Current role: ' || COALESCE(current_user_role, 'Unknown');
  END IF;

  -- Delete the auth user
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Check how many rows were affected
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RETURN 'SUCCESS: Auth user deleted successfully';
  ELSE
    RETURN 'ERROR: Failed to delete auth user (no rows affected)';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;

delete_auth_user_simple =>
    DECLARE
  deleted_count INTEGER;
  auth_user_exists BOOLEAN;
BEGIN
  -- Check if auth user exists first
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO auth_user_exists;
  
  IF NOT auth_user_exists THEN
    RETURN 'WARNING: No auth user found with ID ' || user_id::text;
  END IF;

  -- Delete the auth user
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Check how many rows were affected
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RETURN 'SUCCESS: Auth user deleted successfully';
  ELSE
    RETURN 'ERROR: Failed to delete auth user (no rows affected)';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;

update_user_admin =>
    DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  -- Verify the caller is an Admin or Gestionnaire
  SELECT role INTO caller_role
  FROM utilisateurs
  WHERE auth_id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('Admin', 'Gestionnaire') THEN
    RAISE EXCEPTION 'Permission denied: Admin or Gestionnaire role required';
  END IF;

  -- Update the target user
  UPDATE utilisateurs
  SET
    nom = COALESCE(p_updates->>'nom', nom),
    prenom = COALESCE(p_updates->>'prenom', prenom),
    telephone = CASE WHEN p_updates ? 'telephone' THEN p_updates->>'telephone' ELSE telephone END,
    adresse = CASE WHEN p_updates ? 'adresse' THEN p_updates->>'adresse' ELSE adresse END,
    ville = CASE WHEN p_updates ? 'ville' THEN p_updates->>'ville' ELSE ville END,
    vehicule = CASE WHEN p_updates ? 'vehicule' THEN p_updates->>'vehicule' ELSE vehicule END,
    zone = CASE WHEN p_updates ? 'zone' THEN p_updates->>'zone' ELSE zone END,
    statut = COALESCE(p_updates->>'statut', statut),
    date_modification = NOW()
  WHERE id = p_user_id
  RETURNING to_jsonb(utilisateurs.*) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN result;
END;

update_user_email_admin =>
    BEGIN
  -- Update email in auth.users table
  UPDATE auth.users 
  SET email = new_email, 
      updated_at = now()
  WHERE id = user_auth_id;
  
  -- Return success
  RETURN json_build_object('success', true, 'email', new_email);
END;

update_user_password_admin =>
    BEGIN
  -- Update password in auth.users table (Supabase will hash it automatically)
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_auth_id;
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Password updated');
END;